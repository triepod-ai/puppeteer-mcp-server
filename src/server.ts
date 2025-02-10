import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./config/logger.js";
import { TOOLS } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handlers.js";
import { setupResourceHandlers } from "./resources/handlers.js";
import { BrowserState } from "./types/global.js";
import { closeBrowser } from "./browser/connection.js";

// Initialize global state
const state: BrowserState = {
  consoleLogs: [],
  screenshots: new Map(),
};

// Create and configure server
const server = new Server(
  {
    name: "example-servers/puppeteer",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Setup resource handlers
setupResourceHandlers(server, state);

// Setup tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {}, state, server)
);

// Handle server shutdown
process.stdin.on("close", async () => {
  logger.info("Puppeteer MCP Server closing");
  await closeBrowser();
  await server.close();
});

// Start the server
export async function runServer() {
  try {
    logger.info('Starting MCP server');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('MCP server started successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}
