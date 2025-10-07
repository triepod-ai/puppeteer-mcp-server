"""
Pydantic models for Puppeteer MCP FastAPI server.
"""

from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field


# Request Models
class ConnectActiveTabRequest(BaseModel):
    """Request to connect to an active Chrome tab."""
    targetUrl: Optional[str] = Field(None, description="URL of target tab")
    debugPort: Optional[int] = Field(9222, description="Chrome debugging port")


class NavigateRequest(BaseModel):
    """Request to navigate to a URL."""
    url: str = Field(..., description="URL to navigate to")


class ScreenshotRequest(BaseModel):
    """Request to take a screenshot."""
    name: str = Field(..., description="Name for the screenshot")
    selector: Optional[str] = Field(None, description="CSS selector for element")
    width: Optional[int] = Field(800, description="Width in pixels")
    height: Optional[int] = Field(600, description="Height in pixels")


class ClickRequest(BaseModel):
    """Request to click an element."""
    selector: str = Field(..., description="CSS selector for element to click")


class FillRequest(BaseModel):
    """Request to fill an input field."""
    selector: str = Field(..., description="CSS selector for input field")
    value: str = Field(..., description="Value to fill")


class SelectRequest(BaseModel):
    """Request to select a dropdown option."""
    selector: str = Field(..., description="CSS selector for select element")
    value: str = Field(..., description="Option value to select")


class HoverRequest(BaseModel):
    """Request to hover over an element."""
    selector: str = Field(..., description="CSS selector for element to hover")


class EvaluateRequest(BaseModel):
    """Request to execute JavaScript."""
    script: str = Field(..., description="JavaScript code to execute")


# Response Models
class ToolResponse(BaseModel):
    """Standard response for tool operations."""
    success: bool = Field(..., description="Whether operation succeeded")
    content: List[Dict[str, Any]] = Field(..., description="Response content")
    error: Optional[str] = Field(None, description="Error message if failed")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    mcp_server: str = Field(..., description="MCP server status")


class ResourcesResponse(BaseModel):
    """Resources available from MCP server."""
    resources: List[Dict[str, Any]] = Field(..., description="Available resources")
