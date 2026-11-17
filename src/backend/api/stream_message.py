import json
import httpx
from backend.request_models import getMessage
import logging
import os

log = logging.getLogger(__name__)


async def event_generator(message: getMessage.ChatCompletions, url, payload, headers, searchKey):
    current_messages = list(message.history)
    # Supports Tavily only for now.
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    if not TAVILY_API_KEY or not TAVILY_API_KEY.startswith("tvly-"):
        log.error("TAVILY_API_KEY is missing or invalid")
    # We loop twice: 1st for tool call, 2nd for final answer
    for _ in range(2):
        payload["messages"] = current_messages
        
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    yield f"data: {json.dumps({'error': body.decode(errors='ignore')})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                tool_calls_buffer = {}
                has_tool_calls = False
                assistant_content = ""

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    
                    try:
                        parsed = json.loads(data_str)
                        delta = parsed.get("choices", [{}])[0].get("delta", {})
                        
                        # Stream text
                        if "content" in delta and delta["content"]:
                            assistant_content += delta["content"]
                            yield line + "\n\n" 

                        # Buffer tool calls
                        if "tool_calls" in delta:
                            has_tool_calls = True
                            for tc in delta["tool_calls"]:
                                idx = tc.get("index", 0)
                                if idx not in tool_calls_buffer:
                                    tool_calls_buffer[idx] = {"id": "", "name": "", "arguments": ""}
                                
                                if "id" in tc: tool_calls_buffer[idx]["id"] = tc["id"]
                                if "function" in tc:
                                    if "name" in tc["function"]: tool_calls_buffer[idx]["name"] += tc["function"]["name"]
                                    if "arguments" in tc["function"]: tool_calls_buffer[idx]["arguments"] += tc["function"]["arguments"]
                    except Exception as e:
                        log.error(f"Parse error: {e}")

                # If the model asked to use a tool, execute it and loop again
                if has_tool_calls:
                    current_messages.append({
                        "role": "assistant",
                        "content": assistant_content or None,
                        "tool_calls": [
                            {
                                "id": tc["id"],
                                "type": "function",
                                "function": {"name": tc["name"], "arguments": tc["arguments"]}
                            } for tc in tool_calls_buffer.values()
                        ]
                    })

                    for tc in tool_calls_buffer.values():
                        try:
                            args = json.loads(tc["arguments"])
                            
                            # ---- DIRECT TAVILY CALL ----
                            if tc["name"] == "search_web":
                                tavily_payload = {
                                    "query": args.get("query", ""),
                                    "max_results": 5
                                }
                                
                                tavily_headers = {
                                        "Authorization": f"Bearer {TAVILY_API_KEY}",
                                        "Content-Type": "application/json"
                                    }
                                
                                
                                async with httpx.AsyncClient() as tv_client:
                                    tv_res = await tv_client.post("https://api.tavily.com/search", json=tavily_payload, headers=tavily_headers)
                                    tv_data = tv_res.json()
                                    
                                    # Format for your React UI
                                    news_payload = [
                                        {
                                            "title": r.get("title", ""),
                                            "url": r.get("url", ""),
                                            "summary": r.get("content", ""),
                                            "provider": "tavily"
                                        }
                                        for r in tv_data.get("results", [])[:5]
                                    ]
                                    if news_payload:
                                        yield f"data: {json.dumps({'type': 'news_data', 'payload': news_payload})}\n\n"
                                    
                                    # The tool result for the LLM
                                    result_text = json.dumps(tv_data.get("results", []))
                            else:
                                result_text = "Tool not recognized."

                            # Append result to history
                            current_messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": result_text
                            })
                        except Exception as e:
                            log.error(f"Tool execution failed: {e}")
                            current_messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": f"Error: {e}"
                            })
                    
                    # Continue the loop to make the SECOND call with tool results
                    continue 
                
                # If no tool calls, we are done.
                break

    yield "data: [DONE]\n\n"