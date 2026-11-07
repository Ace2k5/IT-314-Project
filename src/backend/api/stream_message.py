import json
import httpx
from backend.request_models import getMessage
import logging

log = logging.getLogger(__name__)

async def event_generator(message: getMessage.ChatCompletions, url, payload, headers, mcp_client):
    current_messages = list(message.history) # Copy so we can append to it safely
    
    # We might loop twice: once for the tool call, once for the final answer
    for _ in range(2): 
        payload["messages"] = current_messages
        
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    yield f"data: {json.dumps({'error': body.decode(errors='ignore')})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                # Buffers for tool calls
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
                        
                        # 1. Stream text to frontend
                        if "content" in delta and delta["content"]:
                            assistant_content += delta["content"]
                            yield line + "\n\n" # Pass through to React

                        # 2. Buffer tool calls
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

                # ---------------------------------------------------------
                # If the model asked to use a tool, execute it and loop again
                # ---------------------------------------------------------
                if has_tool_calls:
                    # A. Append the assistant's tool request to history
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

                    # B. Execute each tool via MCP
                    for tc in tool_calls_buffer.values():
                        try:
                            args = json.loads(tc["arguments"])
                            # Execute via MCP Client
                            mcp_result = await mcp_client.call_tool(tc["name"], args)
                            
                            # Format result (FastMCP returns CallToolResult objects)
                            result_text = mcp_result.content[0].text if mcp_result.content else str(mcp_result)
                            
                            
                            # Argus-Search
                            # -------------------------------------------
                            if tc["name"] == "search_web":
                                try:
                                    search_data = json.loads(result_text)
                                    news_payload = [
                                        {
                                            "title": r.get("title", ""),
                                            "url": r.get("url", ""),
                                            "summary": r.get("snippet", ""),
                                            "provider": r.get("provider", ""),
                                        }
                                        for r in search_data.get("results", [])[:5]
                                    ]
                                    if news_payload:
                                        yield f"data: {json.dumps({'type': 'news_data', 'payload': news_payload})}\n\n"
                                except json.JSONDecodeError as e:
                                    log.error(f"Failed to parse search result JSON: {e}")
                            # -------------------------------------------
                            
                            
                            # Append tool result to history
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
                    
                    # Continue the for-loop to make the SECOND call with tool results
                    continue 
                
                # If no tool calls, we are done. Break the loop.
                break

    yield "data: [DONE]\n\n"