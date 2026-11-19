"""Server-sent-events bridge between the frontend and an OpenAI-compatible API.

The model may answer directly or ask for a web search first.  Upstream chunks are
forwarded unchanged so the frontend keeps its token-by-token stream, with two
extra events of our own:

``{"type": "news_data", "payload": [...]}``  search results for the news panel
``{"type": "reset"}``                       discard text streamed for a tool round
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from backend.config import get_tavily_key
from backend.request_models.models import ChatRequest

log = logging.getLogger(__name__)

MAX_ROUNDS = 2
TAVILY_ENDPOINT = "https://api.tavily.com/search"
TAVILY_MAX_RESULTS = 5
SEARCH_TOOL_NAME = "search_web"


def _sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def _search_web(query: str, api_key: str | None) -> tuple[str, list[dict[str, str]]]:
    """Run one Tavily query. Returns the tool result and the news payload."""
    if not api_key:
        log.error("[Search] No Tavily key in the environment; the model cannot search the web.")
        return json.dumps({"error": "web search is not configured"}), []
    if not api_key.startswith("tvly-"):
        log.error("[Search] Tavily key does not start with 'tvly-'; skipping the search.")
        return json.dumps({"error": "web search is misconfigured"}), []

    payload = {"query": query, "max_results": TAVILY_MAX_RESULTS}
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(TAVILY_ENDPOINT, json=payload, headers=headers)
    except httpx.HTTPError as error:
        log.error("[Search] Tavily request failed: %s", error)
        return json.dumps({"error": "web search failed"}), []

    if response.status_code != 200:
        log.error("[Search] Tavily answered with status %s", response.status_code)
        return json.dumps({"error": f"web search failed with {response.status_code}"}), []

    try:
        results: list[dict[str, Any]] = response.json().get("results", [])
    except ValueError as error:
        log.error("[Search] Tavily returned unreadable JSON: %s", error)
        return json.dumps({"error": "web search returned invalid JSON"}), []

    news = [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "summary": item.get("content", ""),
            "provider": "tavily",
        }
        for item in results[:TAVILY_MAX_RESULTS]
    ]
    log.info("[Search] '%s' returned %s results", query, len(news))
    return json.dumps(results), news


async def event_generator(request: ChatRequest, url: str, payload: dict[str, Any], headers: dict[str, str]):
    """Yield SSE frames for the frontend until the model stops asking for tools."""
    messages: list[dict[str, Any]] = [message.model_dump() for message in request.history]
    # The environment is the default so the key does not have to be retyped every
    # run; a key sent from the settings panel overrides it for that request.
    tavily_key = request.search_key.strip() or get_tavily_key()

    for _ in range(MAX_ROUNDS):
        payload["messages"] = messages
        assistant_text = ""
        tool_calls: dict[int, dict[str, str]] = {}

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    log.error("[Chat] Upstream answered with status %s", response.status_code)
                    yield _sse({"error": body.decode(errors="ignore")})
                    yield "data: [DONE]\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[len("data: "):].strip()
                    if data == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        log.warning("[Chat] Skipped an unparsable upstream chunk.")
                        continue

                    delta = (chunk.get("choices") or [{}])[0].get("delta") or {}

                    if delta.get("content"):
                        assistant_text += delta["content"]
                        yield f"{line}\n\n"

                    for call in delta.get("tool_calls") or []:
                        index = call.get("index", 0)
                        buffered = tool_calls.setdefault(index, {"id": "", "name": "", "arguments": ""})
                        if call.get("id"):
                            buffered["id"] = call["id"]
                        function = call.get("function") or {}
                        if function.get("name"):
                            buffered["name"] += function["name"]
                        if function.get("arguments"):
                            buffered["arguments"] += function["arguments"]

        if not tool_calls:
            break

        # The text streamed during a tool round is the model thinking out loud,
        # not the answer, so tell the frontend to throw it away.
        if assistant_text:
            yield _sse({"type": "reset"})

        messages.append({
            "role": "assistant",
            "content": assistant_text or None,
            "tool_calls": [
                {
                    "id": call["id"],
                    "type": "function",
                    "function": {"name": call["name"], "arguments": call["arguments"]},
                }
                for call in tool_calls.values()
            ],
        })

        for call in tool_calls.values():
            result = json.dumps({"error": "unknown tool"})
            try:
                arguments = json.loads(call["arguments"] or "{}")
                if call["name"] == SEARCH_TOOL_NAME:
                    result, news = await _search_web(arguments.get("query", ""), tavily_key)
                    if news:
                        yield _sse({"type": "news_data", "payload": news})
            except json.JSONDecodeError as error:
                log.error("[Chat] Tool arguments were not valid JSON: %s", error)
                result = json.dumps({"error": "arguments were not valid JSON"})

            messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": result,
            })

    yield "data: [DONE]\n\n"
