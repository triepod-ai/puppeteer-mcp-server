# Puppeteer MCP Server

[![smithery badge](https://smithery.ai/badge/@merajmehrabi/puppeteer-mcp-server)](https://smithery.ai/server/@merajmehrabi/puppeteer-mcp-server)
This MCP server provides browser automation capabilities through Puppeteer, allowing interaction with both new browser instances and existing Chrome windows.

## Acknowledgment

This project is an experimental implementation inspired by [@modelcontextprotocol/server-puppeteer](https://github.com/modelcontextprotocol/servers). While it shares similar goals and concepts, it explores alternative approaches to browser automation through the Model Context Protocol.

<a href="https://glama.ai/mcp/servers/lpt1tvbubf"><img width="380" height="200" src="https://glama.ai/mcp/servers/lpt1tvbubf/badge" alt="Puppeteer Server MCP server" /></a>

## 🚀 Fork Enhancements & Contributions

This fork includes significant improvements and new capabilities beyond the original implementation:

### **Latest MCP SDK & Protocol (October 2025)**
- **Upgraded SDK**: `@modelcontextprotocol/sdk` from `1.0.1` → `1.19.1` (18 version jump)
- **Protocol Version**: Updated from `2024-11-05` → `2025-03-26`
- **New Protocol Features**:
  - OAuth 2.1 authorization framework support
  - Streamable HTTP transport (replaces deprecated SSE)
  - Tool annotations for behavior metadata
  - Enhanced progress notifications with messages
  - Audio content type support
  - JSON-RPC request batching

### **Dual-Server Architecture: Stdio + FastAPI HTTP**
Added complete FastAPI REST API server mode alongside the standard MCP stdio mode:

- **Stdio Mode** (Standard MCP): Direct Claude Desktop integration via JSON-RPC
- **HTTP Mode** (NEW): REST API on port 9136 for web integrations
  - FastAPI server with automatic OpenAPI documentation
  - Full HTTP endpoints for all 8 Puppeteer tools
  - CORS enabled for browser access
  - Health checks and resource listing
  - Compatible with Open WebUI and direct API calls
  - Comprehensive startup/management scripts

**Architecture**: Both modes share the same TypeScript MCP core, ensuring consistent behavior while offering flexible integration options.

### **LLM-Optimized Tool Descriptions**
Comprehensive enhancement of all tool documentation for improved LLM understanding:

- **Complete Parameter Documentation**: Every parameter now has detailed descriptions with examples
- **Format Specifications**: CSS selector patterns, URL formats, value constraints
- **Usage Context**: Prerequisites, return values, behavioral details, timeout information
- **Concrete Examples**: Real-world selector examples, common patterns, edge cases
- **Execution Details**: Browser context clarification, serialization limits, wait states

**Tools Enhanced**:
- `puppeteer_connect_active_tab` - Chrome debugging setup, port ranges, tab targeting
- `puppeteer_navigate` - Protocol support, timeout info, networkidle0 wait behavior
- `puppeteer_screenshot` - Resource URI usage, viewport sizing, common resolutions
- `puppeteer_click` - Element types, selector examples, multi-match behavior
- `puppeteer_fill` - Typing simulation, contenteditable support, content clearing
- `puppeteer_select` - Value vs visible text distinction, option patterns
- `puppeteer_hover` - Hover state persistence, common use cases
- `puppeteer_evaluate` - Browser vs Node.js context, serialization constraints, console capture

### **Enhanced Development Infrastructure**
- Python virtual environment management with `uv` package manager
- Comprehensive `.gitignore` updates for Python and Node.js projects
- FastAPI server management scripts with auto-restart and health checks
- Improved logging strategy for both server modes
- Clean stdio handling for MCP protocol compliance

### **Technical Specifications**
- **MCP SDK Version**: 1.19.1
- **MCP Protocol**: 2025-03-26
- **Node.js Requirement**: ≥18
- **Python Version**: 3.11+ (for FastAPI mode)
- **FastAPI Port**: 9136
- **Chrome Debug Port**: 9222 (default)

### **Benefits of This Fork**
✅ Latest MCP protocol features and improvements
✅ Dual integration modes (stdio + HTTP REST API)
✅ Superior LLM comprehension through enhanced descriptions
✅ Modern FastAPI implementation with OpenAPI docs
✅ Production-ready with comprehensive testing
✅ Backward compatible with existing configurations
✅ Well-documented for both developers and AI agents

**Documentation**: See `CLAUDE.md` for detailed architecture documentation and `README_FASTAPI.md` for HTTP mode setup.

## Features

- Navigate web pages
- Take screenshots
- Click elements
- Fill forms
- Select options
- Hover elements
- Execute JavaScript
- Smart Chrome tab management:
  - Connect to active Chrome tabs
  - Preserve existing Chrome instances
  - Intelligent connection handling

## Project Structure

```
/
├── src/
│   ├── config/        # Configuration modules
│   ├── tools/         # Tool definitions and handlers
│   ├── browser/       # Browser connection management
│   ├── types/         # TypeScript type definitions
│   ├── resources/     # Resource handlers
│   └── server.ts      # Server initialization
├── index.ts          # Entry point
└── README.md        # Documentation
```

## Installation

### Option 1: Install from npm

```bash
npm install -g puppeteer-mcp-server
```

You can also run it directly without installation using npx:

```bash
npx puppeteer-mcp-server
```

### Option 2: Install from source

1. Clone this repository or download the source code
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Run the server:

```bash
npm start
```

## MCP Server Configuration

To use this tool with Claude, you need to add it to your MCP settings configuration file.

### For Claude Desktop App

Add the following to your Claude Desktop configuration file (located at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

#### If installed globally via npm:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "puppeteer-mcp-server",
      "args": [],
      "env": {}
    }
  }
}
```

#### Using npx (without installation):

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "puppeteer-mcp-server"],
      "env": {}
    }
  }
}
```

#### If installed from source:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "node",
      "args": ["path/to/puppeteer-mcp-server/dist/index.js"],
      "env": {
        "NODE_OPTIONS": "--experimental-modules"
      }
    }
  }
}
```

### For Claude VSCode Extension

Add the following to your Claude VSCode extension MCP settings file (located at `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` on Windows or `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` on macOS):

#### If installed globally via npm:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "puppeteer-mcp-server",
      "args": [],
      "env": {}
    }
  }
}
```

#### Using npx (without installation):

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "puppeteer-mcp-server"],
      "env": {}
    }
  }
}
```

#### If installed from source:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "node",
      "args": ["path/to/puppeteer-mcp-server/dist/index.js"],
      "env": {
        "NODE_OPTIONS": "--experimental-modules"
      }
    }
  }
}
```

For source installation, replace `path/to/puppeteer-mcp-server` with the actual path to where you installed this tool.

## Usage

### Standard Mode

The server will launch a new browser instance by default.

### Active Tab Mode

To connect to an existing Chrome window:

1. Close any existing Chrome instances completely

2. Launch Chrome with remote debugging enabled:
   ```bash
   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

   # Linux
   google-chrome --remote-debugging-port=9222
   ```

3. Navigate to your desired webpage in Chrome

4. Connect using the `puppeteer_connect_active_tab` tool:
   ```json
   {
     "targetUrl": "https://example.com", // Optional: specific tab URL
     "debugPort": 9222 // Optional: defaults to 9222
   }
   ```

The server will:
- Detect and connect to the Chrome instance running with remote debugging enabled
- Preserve your Chrome instance (won't close it)
- Find and connect to non-extension tabs
- Provide clear error messages if connection fails

## Available Tools

### puppeteer_connect_active_tab
Connect to an existing Chrome instance with remote debugging enabled.
- Optional:
  - `targetUrl` - URL of the specific tab to connect to
  - `debugPort` - Chrome debugging port (default: 9222)

### puppeteer_navigate
Navigate to a URL.
- Required: `url` - The URL to navigate to

### puppeteer_screenshot
Take a screenshot of the current page or a specific element.
- Required: `name` - Name for the screenshot
- Optional:
  - `selector` - CSS selector for element to screenshot
  - `width` - Width in pixels (default: 800)
  - `height` - Height in pixels (default: 600)

### puppeteer_click
Click an element on the page.
- Required: `selector` - CSS selector for element to click

### puppeteer_fill
Fill out an input field.
- Required:
  - `selector` - CSS selector for input field
  - `value` - Text to enter

### puppeteer_select
Use dropdown menus.
- Required:
  - `selector` - CSS selector for select element
  - `value` - Option value to select

### puppeteer_hover
Hover over elements.
- Required: `selector` - CSS selector for element to hover

### puppeteer_evaluate
Execute JavaScript in the browser console.
- Required: `script` - JavaScript code to execute

## Security Considerations

When using remote debugging:
- Only enable on trusted networks
- Use a unique debugging port
- Close debugging port when not in use
- Never expose debugging port to public networks

## Logging and Debugging

### File-based Logging
The server implements comprehensive logging using Winston:

- Location: `logs/` directory
- File Pattern: `mcp-puppeteer-YYYY-MM-DD.log`
- Log Rotation:
  - Daily rotation
  - Maximum size: 20MB per file
  - Retention: 14 days
  - Automatic compression of old logs

### Log Levels
- DEBUG: Detailed debugging information
- INFO: General operational information
- WARN: Warning messages
- ERROR: Error events and exceptions

### Logged Information
- Server startup/shutdown events
- Browser operations (launch, connect, close)
- Navigation attempts and results
- Tool executions and outcomes
- Error details with stack traces
- Browser console output
- Resource usage (screenshots, console logs)

## Error Handling

The server provides detailed error messages for:
- Connection failures
- Missing elements
- Invalid selectors
- JavaScript execution errors
- Screenshot failures

Each tool call returns:
- Success/failure status
- Detailed error message if failed
- Operation result data if successful

All errors are also logged to the log files with:
- Timestamp
- Error message
- Stack trace (when available)
- Context information

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
