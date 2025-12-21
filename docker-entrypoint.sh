#!/bin/bash
# docker-entrypoint.sh - Process supervisor for Puppeteer MCP HTTP server
# Manages Chrome headless browser and FastAPI server lifecycle

set -e

# Configuration
CHROME_DEBUG_PORT="${CHROME_DEBUG_PORT:-9222}"
CHROME_INTERNAL_PORT=9223  # Chrome binds to localhost only, so we use an internal port
FASTAPI_PORT="${FASTAPI_PORT:-9136}"
FASTAPI_HOST="${FASTAPI_HOST:-0.0.0.0}"
CHROME_STARTUP_TIMEOUT=30

echo "=========================================="
echo "Puppeteer MCP HTTP Server"
echo "=========================================="
echo "Chrome Debug Port: $CHROME_DEBUG_PORT (external)"
echo "Chrome Internal Port: $CHROME_INTERNAL_PORT (localhost only)"
echo "FastAPI Port: $FASTAPI_PORT"
echo ""

# -----------------------------------------------------------------------------
# Start Chrome in headless mode with remote debugging
# Note: Chrome ignores --remote-debugging-address in headless mode (security feature)
# So we use socat to proxy external connections to Chrome's localhost-only port
# -----------------------------------------------------------------------------
echo "[1/4] Starting Chrome headless..."

chromium \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-setuid-sandbox \
    --remote-debugging-port="$CHROME_INTERNAL_PORT" \
    --remote-allow-origins=* \
    --disable-web-security \
    --disable-features=IsolateOrigins,site-per-process \
    --disable-site-isolation-trials \
    --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    &

CHROME_PID=$!
echo "Chrome started with PID: $CHROME_PID"

# -----------------------------------------------------------------------------
# Wait for Chrome to be ready
# -----------------------------------------------------------------------------
echo "[2/4] Waiting for Chrome to be ready..."

SECONDS_WAITED=0
until curl -s "http://localhost:$CHROME_INTERNAL_PORT/json/version" > /dev/null 2>&1; do
    if [ $SECONDS_WAITED -ge $CHROME_STARTUP_TIMEOUT ]; then
        echo "ERROR: Chrome failed to start within $CHROME_STARTUP_TIMEOUT seconds"
        kill $CHROME_PID 2>/dev/null || true
        exit 1
    fi
    sleep 0.5
    SECONDS_WAITED=$((SECONDS_WAITED + 1))
done

echo "Chrome ready on internal port $CHROME_INTERNAL_PORT"

# -----------------------------------------------------------------------------
# Start socat proxy for external Chrome DevTools access
# This proxies 0.0.0.0:9222 -> 127.0.0.1:9223 (Chrome's localhost-only port)
# -----------------------------------------------------------------------------
echo "[3/4] Starting socat proxy for external DevTools access..."

socat TCP-LISTEN:$CHROME_DEBUG_PORT,fork,reuseaddr TCP:127.0.0.1:$CHROME_INTERNAL_PORT &
SOCAT_PID=$!
echo "Socat proxy started with PID: $SOCAT_PID (external $CHROME_DEBUG_PORT -> internal $CHROME_INTERNAL_PORT)"

# Wait briefly for socat to start
sleep 0.5

# Get Chrome WebSocket endpoint for MCP server (use internal port)
CHROME_WS_ENDPOINT=$(curl -s "http://localhost:$CHROME_INTERNAL_PORT/json/version" | jq -r '.webSocketDebuggerUrl')
export CHROME_WS_ENDPOINT
echo "Chrome WS Endpoint: $CHROME_WS_ENDPOINT"

# -----------------------------------------------------------------------------
# Graceful shutdown handler
# -----------------------------------------------------------------------------
shutdown() {
    echo ""
    echo "Shutting down..."

    # Kill socat proxy
    if [ -n "$SOCAT_PID" ] && kill -0 $SOCAT_PID 2>/dev/null; then
        echo "Stopping socat proxy (PID: $SOCAT_PID)..."
        kill $SOCAT_PID 2>/dev/null || true
    fi

    # Kill Chrome process
    if [ -n "$CHROME_PID" ] && kill -0 $CHROME_PID 2>/dev/null; then
        echo "Stopping Chrome (PID: $CHROME_PID)..."
        kill $CHROME_PID 2>/dev/null || true
        wait $CHROME_PID 2>/dev/null || true
    fi

    echo "Shutdown complete"
    exit 0
}

trap shutdown SIGTERM SIGINT SIGQUIT

# -----------------------------------------------------------------------------
# Start FastAPI server (foreground)
# -----------------------------------------------------------------------------
echo "[4/4] Starting FastAPI server..."
echo ""

cd /app/fastapi_server

# Run uvicorn in foreground (exec replaces shell with uvicorn process)
exec /app/venv/bin/python -m uvicorn main:app \
    --host "$FASTAPI_HOST" \
    --port "$FASTAPI_PORT" \
    --log-level info
