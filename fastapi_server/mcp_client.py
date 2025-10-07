"""
MCP Client for communicating with Puppeteer MCP server via stdio.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
import signal

logger = logging.getLogger(__name__)


class MCPClient:
    """Client for communicating with MCP server over stdio."""

    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.process: Optional[asyncio.subprocess.Process] = None
        self.request_id = 0
        self._lock = asyncio.Lock()
        self._initialized = False

    async def start(self):
        """Start the MCP server subprocess."""
        try:
            logger.info("Starting Puppeteer MCP server...")

            # Start the MCP server using npx tsx
            self.process = await asyncio.create_subprocess_exec(
                "npx", "tsx", "index.ts",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_dir)
            )

            logger.info(f"MCP server started with PID: {self.process.pid}")

            # Initialize the MCP connection
            await self._initialize_connection()

            # Start stderr monitoring task
            asyncio.create_task(self._monitor_stderr())

            logger.info("MCP server ready")

        except Exception as e:
            logger.error(f"Failed to start MCP server: {e}")
            raise

    async def _initialize_connection(self):
        """Initialize the MCP protocol connection."""
        try:
            # Send initialize request
            init_request = {
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {
                        "tools": {}
                    },
                    "clientInfo": {
                        "name": "puppeteer-fastapi-client",
                        "version": "1.0.0"
                    }
                }
            }

            response = await self._send_request(init_request)
            logger.debug(f"Initialize response: {response}")

            # Send initialized notification
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized"
            }

            await self._send_notification(initialized_notification)
            self._initialized = True
            logger.info("MCP connection initialized")

        except Exception as e:
            logger.error(f"Failed to initialize MCP connection: {e}")
            raise

    async def _monitor_stderr(self):
        """Monitor stderr for errors and logs."""
        if not self.process or not self.process.stderr:
            return

        try:
            while True:
                line = await self.process.stderr.readline()
                if not line:
                    break

                log_line = line.decode().strip()
                if log_line:
                    logger.debug(f"MCP stderr: {log_line}")

        except Exception as e:
            logger.error(f"Error monitoring stderr: {e}")

    def _next_id(self) -> int:
        """Get next request ID."""
        self.request_id += 1
        return self.request_id

    async def _send_notification(self, notification: Dict[str, Any]):
        """Send a JSON-RPC notification (no response expected)."""
        if not self.process or not self.process.stdin:
            raise RuntimeError("MCP server not running")

        message = json.dumps(notification) + "\n"
        self.process.stdin.write(message.encode())
        await self.process.stdin.drain()

    async def _send_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Send a JSON-RPC request and wait for response."""
        if not self.process or not self.process.stdin or not self.process.stdout:
            raise RuntimeError("MCP server not running")

        async with self._lock:
            # Send request
            message = json.dumps(request) + "\n"
            logger.debug(f"Sending request: {message.strip()}")

            self.process.stdin.write(message.encode())
            await self.process.stdin.drain()

            # Read response
            response_line = await self.process.stdout.readline()
            if not response_line:
                raise RuntimeError("MCP server closed connection")

            response = json.loads(response_line.decode())
            logger.debug(f"Received response: {response}")

            # Check for errors
            if "error" in response:
                raise RuntimeError(f"MCP error: {response['error']}")

            return response

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call an MCP tool."""
        if not self._initialized:
            raise RuntimeError("MCP client not initialized")

        request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }

        try:
            response = await self._send_request(request)
            return response.get("result", {})

        except Exception as e:
            logger.error(f"Tool call failed: {tool_name} - {e}")
            raise

    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools."""
        if not self._initialized:
            raise RuntimeError("MCP client not initialized")

        request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/list"
        }

        response = await self._send_request(request)
        return response.get("result", {}).get("tools", [])

    async def list_resources(self) -> List[Dict[str, Any]]:
        """List available resources."""
        if not self._initialized:
            raise RuntimeError("MCP client not initialized")

        request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "resources/list"
        }

        try:
            response = await self._send_request(request)
            return response.get("result", {}).get("resources", [])
        except Exception as e:
            logger.warning(f"Failed to list resources: {e}")
            return []

    async def stop(self):
        """Stop the MCP server."""
        if self.process:
            logger.info("Stopping MCP server...")

            try:
                # Close stdin to signal server to shutdown
                if self.process.stdin:
                    self.process.stdin.close()

                # Wait for process to exit gracefully
                try:
                    await asyncio.wait_for(self.process.wait(), timeout=5.0)
                    logger.info("MCP server stopped gracefully")
                except asyncio.TimeoutError:
                    logger.warning("MCP server did not stop gracefully, terminating...")
                    self.process.terminate()
                    try:
                        await asyncio.wait_for(self.process.wait(), timeout=2.0)
                    except asyncio.TimeoutError:
                        logger.warning("Force killing MCP server...")
                        self.process.kill()
                        await self.process.wait()

            except Exception as e:
                logger.error(f"Error stopping MCP server: {e}")
                if self.process:
                    self.process.kill()

            self.process = None
            self._initialized = False
