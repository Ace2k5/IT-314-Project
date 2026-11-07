from fastmcp import FastMCP
import httpx

mcp = FastMCP("MCP server")
ARGUS_BASE = "http://localhost:9997"


@mcp.tool()
def say_hello() -> str:
    return "Hello World"

@mcp.tool()
async def search_web(query: str, max_results: int = 5) -> dict:
    payload = {"query": query, "mode": "discovery", "max_results": max_results}
    # session_id is injected by FastAPI via an env/header, or omitted entirely
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{ARGUS_BASE}/api/search", json=payload)
        response.raise_for_status()
        return response.json()
    

async def expose_tools(client):
    async with client:
        mcp_tools = await client.list_tools()
        
        
        openai_tools = []
        for t in mcp_tools:
            openai_tools.append({
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.input_schema
            }
        })
        return openai_tools