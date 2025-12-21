# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dual-Server Architecture

This repository implements **two distinct server modes** that share the same core Puppeteer MCP implementation:

### 1. MCP Stdio Server (Standard Mode)
- **Purpose**: Claude Desktop integration via MCP protocol
- **Transport**: stdio (JSON-RPC over stdin/stdout)
- **Wrapper**: `~/run-puppeteer-mcp.sh`
- **Execution**: `npx tsx index.ts`
- **Logs**: `~/.puppeteer-mcp/logs/puppeteer-mcp-*.log`
- **Use Case**: Direct integration with Claude Desktop App

### 2. FastAPI REST Server (HTTP Mode)
- **Purpose**: HTTP REST API for Open WebUI and direct API calls
- **Transport**: HTTP on port 9136
- **Startup**: `~/start-puppeteer-mcpo.sh`
- **Architecture**: FastAPI → MCP subprocess → Puppeteer
- **Logs**: `./fastapi_server.log`
- **Use Case**: Web-based integrations, HTTP clients

**Critical**: Both modes use the same TypeScript MCP server (`src/`) but differ in how they expose it (stdio vs HTTP).

## Build Commands

```bash
# Build TypeScript to dist/
npm run build

# Watch mode for development
npm run watch

# Install dependencies
npm install
```

The build creates `dist/index.js` with executable permissions, required by both server modes.

## Running the Servers

### MCP Stdio Mode
```bash
# Start via wrapper (recommended)
~/run-puppeteer-mcp.sh

# Direct execution (for debugging)
npx tsx index.ts

# Check logs
tail -f ~/.puppeteer-mcp/logs/puppeteer-mcp-*.log
```

### FastAPI HTTP Mode
```bash
# First time: Install Python dependencies
./install_fastapi.sh

# Start server
~/start-puppeteer-mcpo.sh

# Check status
~/start-puppeteer-mcpo.sh --status

# Stop server
~/start-puppeteer-mcpo.sh --stop

# Test endpoint
curl http://localhost:9136/health

# View API docs
open http://localhost:9136/docs
```

## Critical Implementation Details

### MCP Stdio Wrapper Pattern
The `~/run-puppeteer-mcp.sh` wrapper **must** keep stdio completely clean for MCP JSON-RPC protocol:

```bash
# ✅ CORRECT - Messages to log file
{
    echo "Server starting..."
    echo "Logging to: $LOG_FILE"
} >> "$LOG_FILE" 2>&1

# ❌ WRONG - Pollutes stdio
echo "Server starting..." >&2
```

**Why**: MCP protocol requires stdout to contain ONLY JSON-RPC messages. Any text pollution breaks Claude Desktop integration.

### FastAPI MCP Client Communication
`fastapi_server/mcp_client.py` manages the MCP subprocess:
- Spawns TypeScript server via `npx tsx index.ts`
- Communicates via JSON-RPC over stdio
- Handles MCP protocol initialization handshake
- Manages graceful shutdown

**Key Pattern**: FastAPI never talks to Puppeteer directly - it always goes through the MCP protocol layer.

## Architecture Flow

```
┌─────────────────┐              ┌─────────────────┐
│ Claude Desktop  │              │   HTTP Client   │
│   (stdio MCP)   │              │  (REST calls)   │
└────────┬────────┘              └────────┬────────┘
         │                                │
         │                                │
    ┌────▼──────────┐            ┌───────▼──────────┐
    │ run-puppeteer │            │ FastAPI Server   │
    │  -mcp.sh      │            │   (main.py)      │
    └────┬──────────┘            └───────┬──────────┘
         │                                │
         │                        ┌───────▼──────────┐
         │                        │   MCPClient      │
         │                        │ (mcp_client.py)  │
         │                        └───────┬──────────┘
         │                                │
         └────────────┬───────────────────┘
                      │
              ┌───────▼────────┐
              │ MCP Server     │
              │ (index.ts)     │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │   Puppeteer    │
              │   Browser      │
              └────────────────┘
```

Both entry points converge on the same MCP server implementation.

## Core MCP Implementation

### Server Initialization (`src/server.ts`)
- Creates MCP Server with stdio transport
- Registers 8 Puppeteer tools
- Manages global browser state (screenshots, console logs)
- Handles graceful shutdown on stdin close

### Tool Handlers (`src/tools/handlers.ts`)
All tools follow the pattern:
1. Get/ensure browser instance
2. Execute Puppeteer operation
3. Return MCP-compliant response with `content` and `isError`

### Browser Management (`src/browser/connection.ts`)
- Singleton browser instance
- Supports both new browser launch and connecting to existing Chrome (port 9222)
- Console log capture
- Proper cleanup on close

## Python Virtual Environment (FastAPI Mode)

**Critical**: This project uses `uv` for Python virtual environment management (per WSL requirements).

```bash
# Installation creates venv
./install_fastapi.sh

# Venv location
./fastapi_server/venv/

# Activate manually (if needed)
source fastapi_server/venv/bin/activate

# Run server manually
cd fastapi_server
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 9136
```

## Logging Strategy

### MCP Stdio Mode
- **Location**: `~/.puppeteer-mcp/logs/`
- **Format**: `puppeteer-mcp-YYYYMMDD-HHMMSS.log`
- **Content**: Startup info, errors, Winston logs from MCP server
- **Rotation**: New file per execution (timestamped)

### FastAPI HTTP Mode
- **Location**: `./fastapi_server.log`
- **Content**: FastAPI startup, MCP communication, HTTP requests
- **Rotation**: Overwritten per restart

### Core MCP Server
- **Location**: `./logs/`
- **Format**: `mcp-puppeteer-YYYY-MM-DD.log`
- **Winston Configuration**: Daily rotation, 20MB max, 14-day retention

## Testing the Servers

### Verify MCP Stdio Mode
```bash
# Should have clean stdout (no text output)
timeout 1 ~/run-puppeteer-mcp.sh 2>&1 | wc -l
# Expected: 0

# Check logs were created
ls -lt ~/.puppeteer-mcp/logs/ | head -3
```

### Verify FastAPI HTTP Mode
```bash
# Health check
curl http://localhost:9136/health
# Expected: {"status":"healthy","service":"puppeteer-mcp-fastapi","mcp_server":"running"}

# Test navigation
curl -X POST http://localhost:9136/api/v1/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# List available tools (via resources)
curl http://localhost:9136/api/v1/resources
```

## Development Workflow

### Modifying Core MCP Tools
1. Edit TypeScript in `src/tools/`
2. Run `npm run build`
3. Test MCP mode: `~/run-puppeteer-mcp.sh`
4. Test HTTP mode: restart `~/start-puppeteer-mcpo.sh`

### Modifying FastAPI Layer
1. Edit Python in `fastapi_server/`
2. No build step needed (Python)
3. Restart: `~/start-puppeteer-mcpo.sh --stop && ~/start-puppeteer-mcpo.sh`
4. Check logs: `tail -f fastapi_server.log`

### Adding New MCP Tools
1. Add tool definition in `src/tools/definitions.ts`
2. Implement handler in `src/tools/handlers.ts`
3. Rebuild: `npm run build`
4. For FastAPI mode: Add corresponding endpoint in `fastapi_server/main.py` and model in `models.py`

## Common Issues

### "dist/index.js not found"
Run `npm run build` - the wrapper scripts require the built JavaScript.

### FastAPI server won't start
Check `./install_fastapi.sh` was run and `fastapi_server/venv/` exists. Remember: use `uv` not `pip`.

### MCP stdio shows text in terminal
Verify wrapper uses command grouping `{ } >> "$LOG_FILE" 2>&1` not `echo ... >&2`. Stdio must be completely clean.

### Port 9136 already in use
```bash
# Stop existing server
~/start-puppeteer-mcpo.sh --stop

# Or force cleanup
~/start-puppeteer-mcpo.sh --force-restart
```

## Available Puppeteer Tools

1. **puppeteer_connect_active_tab** - Connect to existing Chrome (port 9222)
2. **puppeteer_navigate** - Navigate to URL
3. **puppeteer_screenshot** - Capture page/element screenshot
4. **puppeteer_click** - Click element by selector
5. **puppeteer_fill** - Fill input field
6. **puppeteer_select** - Select dropdown option
7. **puppeteer_hover** - Hover over element
8. **puppeteer_evaluate** - Execute JavaScript in browser

All tools return MCP-compliant responses with `content` array and `isError` boolean.

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "/home/bryan/run-puppeteer-mcp.sh",
      "args": [],
      "env": {}
    }
  }
}
```

The wrapper handles clean stdio and proper logging automatically.
