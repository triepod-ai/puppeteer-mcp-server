# Puppeteer MCP FastAPI Wrapper

## Quick Start

```bash
# Install (first time only)
./install_fastapi.sh

# Start server
~/start-puppeteer-mcpo.sh

# Check status
~/start-puppeteer-mcpo.sh --status

# Stop server
~/start-puppeteer-mcpo.sh --stop
```

## Server Info

- **Port**: 9136
- **Health**: http://localhost:9136/health
- **Docs**: http://localhost:9136/docs
- **Logs**: /home/bryan/mcp-servers/puppeteer-mcp/fastapi_server.log

## API Endpoints

1. `POST /api/v1/navigate` - Navigate to URL
2. `POST /api/v1/screenshot` - Take screenshot
3. `POST /api/v1/click` - Click element
4. `POST /api/v1/fill` - Fill form field
5. `POST /api/v1/select` - Select dropdown
6. `POST /api/v1/hover` - Hover element
7. `POST /api/v1/evaluate` - Run JavaScript
8. `POST /api/v1/connect_active_tab` - Connect to Chrome
9. `GET /api/v1/resources` - List resources
10. `GET /health` - Health check

## Example Usage

```bash
# Navigate
curl -X POST http://localhost:9136/api/v1/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# Take screenshot
curl -X POST http://localhost:9136/api/v1/screenshot \
  -H "Content-Type: application/json" \
  -d '{"name":"test", "width":1024, "height":768}'
```

## Architecture

```
FastAPI Server (Python) → MCP Server (TypeScript) → Puppeteer Browser
```

## Files

- `fastapi_server/main.py` - FastAPI application
- `fastapi_server/mcp_client.py` - MCP communication
- `fastapi_server/models.py` - Request/response models
- `fastapi_server/requirements.txt` - Python dependencies
- `install_fastapi.sh` - Installation script
