"""
FastAPI server that exposes Puppeteer MCP tools as REST API endpoints.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from mcp_client import MCPClient
from models import (
    ConnectActiveTabRequest,
    NavigateRequest,
    ScreenshotRequest,
    ClickRequest,
    FillRequest,
    SelectRequest,
    HoverRequest,
    EvaluateRequest,
    ToolResponse,
    HealthResponse,
    ResourcesResponse,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global MCP client
mcp_client: MCPClient = None

# Project directory (parent of fastapi_server)
PROJECT_DIR = Path(__file__).parent.parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage MCP server lifecycle."""
    global mcp_client

    # Startup
    logger.info("Starting Puppeteer MCP FastAPI server...")
    mcp_client = MCPClient(PROJECT_DIR)

    try:
        await mcp_client.start()
        logger.info("MCP client started successfully")
        yield
    finally:
        # Shutdown
        logger.info("Shutting down MCP server...")
        if mcp_client:
            await mcp_client.stop()
        logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Puppeteer MCP REST API",
    description="REST API wrapper for Puppeteer MCP server",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def call_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> ToolResponse:
    """Helper to call MCP tool and format response."""
    try:
        result = await mcp_client.call_tool(tool_name, arguments)

        # Extract content from result
        content = result.get("content", [])
        is_error = result.get("isError", False)

        return ToolResponse(
            success=not is_error,
            content=content,
            error=None if not is_error else "Tool execution failed"
        )

    except Exception as e:
        logger.error(f"Tool call failed: {tool_name} - {e}")
        return ToolResponse(
            success=False,
            content=[],
            error=str(e)
        )


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    mcp_status = "running" if mcp_client and mcp_client._initialized else "not_running"

    return HealthResponse(
        status="healthy",
        service="puppeteer-mcp-fastapi",
        mcp_server=mcp_status
    )


# Resources endpoint
@app.get("/api/v1/resources", response_model=ResourcesResponse)
async def list_resources():
    """List available MCP resources."""
    try:
        resources = await mcp_client.list_resources()
        return ResourcesResponse(resources=resources)
    except Exception as e:
        logger.error(f"Failed to list resources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Connect to active tab
@app.post("/api/v1/connect_active_tab", response_model=ToolResponse)
async def connect_active_tab(request: ConnectActiveTabRequest):
    """Connect to an existing Chrome tab with remote debugging enabled."""
    arguments = {}
    if request.targetUrl:
        arguments["targetUrl"] = request.targetUrl
    if request.debugPort:
        arguments["debugPort"] = request.debugPort

    return await call_mcp_tool("puppeteer_connect_active_tab", arguments)


# Navigate endpoint
@app.post("/api/v1/navigate", response_model=ToolResponse)
async def navigate(request: NavigateRequest):
    """Navigate to a URL."""
    return await call_mcp_tool("puppeteer_navigate", {"url": request.url})


# Screenshot endpoint
@app.post("/api/v1/screenshot", response_model=ToolResponse)
async def screenshot(request: ScreenshotRequest):
    """Take a screenshot."""
    arguments = {
        "name": request.name,
        "width": request.width,
        "height": request.height,
    }

    if request.selector:
        arguments["selector"] = request.selector

    return await call_mcp_tool("puppeteer_screenshot", arguments)


# Click endpoint
@app.post("/api/v1/click", response_model=ToolResponse)
async def click(request: ClickRequest):
    """Click an element."""
    return await call_mcp_tool("puppeteer_click", {"selector": request.selector})


# Fill endpoint
@app.post("/api/v1/fill", response_model=ToolResponse)
async def fill(request: FillRequest):
    """Fill an input field."""
    return await call_mcp_tool(
        "puppeteer_fill",
        {"selector": request.selector, "value": request.value}
    )


# Select endpoint
@app.post("/api/v1/select", response_model=ToolResponse)
async def select(request: SelectRequest):
    """Select a dropdown option."""
    return await call_mcp_tool(
        "puppeteer_select",
        {"selector": request.selector, "value": request.value}
    )


# Hover endpoint
@app.post("/api/v1/hover", response_model=ToolResponse)
async def hover(request: HoverRequest):
    """Hover over an element."""
    return await call_mcp_tool("puppeteer_hover", {"selector": request.selector})


# Evaluate endpoint
@app.post("/api/v1/evaluate", response_model=ToolResponse)
async def evaluate(request: EvaluateRequest):
    """Execute JavaScript in the browser."""
    return await call_mcp_tool("puppeteer_evaluate", {"script": request.script})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9136,
        log_level="info"
    )
