#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  CallToolResult,
  TextContent,
  ImageContent,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'mcp-puppeteer' },
  transports: [
    // Write to rotating log files only to avoid interfering with MCP protocol
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'mcp-puppeteer-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Define the tools once to avoid repetition
const TOOLS: Tool[] = [
  {
    name: "puppeteer_connect_active_tab",
    description: "Connect to an existing Chrome instance with remote debugging enabled",
    inputSchema: {
      type: "object",
      properties: {
        targetUrl: { 
          type: "string", 
          description: "Optional URL of the target tab to connect to. If not provided, connects to the first available tab." 
        },
        debugPort: {
          type: "number",
          description: "Optional Chrome debugging port (default: 9222)",
          default: 9222
        }
      },
      required: [],
    },
  },
  {
    name: "puppeteer_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
  },
  {
    name: "puppeteer_screenshot",
    description: "Take a screenshot of the current page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        width: { type: "number", description: "Width in pixels (default: 800)" },
        height: { type: "number", description: "Height in pixels (default: 600)" },
      },
      required: ["name"],
    },
  },
  {
    name: "puppeteer_click",
    description: "Click an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to click" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_fill",
    description: "Fill out an input field",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for input field" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_select",
    description: "Select an element on the page with Select tag",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to select" },
        value: { type: "string", description: "Value to select" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_hover",
    description: "Hover an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for element to hover" },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_evaluate",
    description: "Execute JavaScript in the browser console",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
      },
      required: ["script"],
    },
  },
];

// Global state
let browser: Browser | undefined;
let page: Page | undefined;
const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();

// Log unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

async function ensureBrowser() {
  if (!browser) {
    const commonArgs = [
      "--disable-web-security",  // Bypass CORS
      "--disable-features=IsolateOrigins,site-per-process", // Disable site isolation
      "--disable-site-isolation-trials",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" // Modern Chrome UA
    ];

    const npx_args = { 
      headless: false,
      args: commonArgs
    };

    const docker_args = { 
      headless: true, 
      args: [
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
        ...commonArgs
      ]
    };

    logger.info('Launching browser with config:', process.env.DOCKER_CONTAINER ? 'docker' : 'npx');
    browser = await puppeteer.launch(process.env.DOCKER_CONTAINER ? docker_args : npx_args);
    const pages = await browser.pages();
    page = pages[0];

    // Set default navigation timeout
    await page.setDefaultNavigationTimeout(30000);
    
    // Enable JavaScript
    await page.setJavaScriptEnabled(true);
    
    logger.info('Browser launched successfully');
  }
  return page!;
}

async function getDebuggerWebSocketUrl(port: number = 9222): Promise<string> {
  try {
    const response = await fetch(`http://localhost:${port}/json/version`);
    if (!response.ok) {
      throw new Error(`Failed to fetch debugger info: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.webSocketDebuggerUrl) {
      throw new Error("No WebSocket debugger URL found. Is Chrome running with --remote-debugging-port?");
    }
    return data.webSocketDebuggerUrl;
  } catch (error) {
    throw new Error(`Failed to connect to Chrome debugging port ${port}: ${(error as Error).message}`);
  }
}

async function connectToExistingBrowser(wsEndpoint: string, targetUrl?: string): Promise<Page> {
  logger.info('Connecting to existing browser', { wsEndpoint, targetUrl });
  try {
    // Close existing browser if any
    if (browser) {
      logger.debug('Closing existing browser connection');
      await browser.close();
      browser = undefined;
      page = undefined;
    }

    // Connect to the browser instance
    logger.debug('Establishing connection to browser');
    browser = await puppeteer.connect({ 
      browserWSEndpoint: wsEndpoint,
      defaultViewport: { width: 800, height: 600 }
    });
    logger.info('Successfully connected to browser');

    // Configure page settings
    page = (await browser.pages())[0];
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Get all pages
    const pages = await browser.pages();
    
    if (targetUrl) {
      // Find the page with matching URL
      page = pages.find(p => p.url() === targetUrl) || pages[0];
    } else {
      // Use the first active page
      page = pages[0];
    }

    if (!page) {
      throw new Error("No active pages found in the browser");
    }

    page.on("console", (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      logger.debug('Browser console:', { type: msg.type(), text: msg.text() });
      server.notification({
        method: "notifications/resources/updated",
        params: { uri: "console://logs" },
      });
    });

    return page;
  } catch (error) {
    throw error;
  }
}

declare global {
  interface Window {
    mcpHelper: {
      logs: string[],
      originalConsole: Partial<typeof console>,
    }
  }
}

async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
  logger.debug('Tool call received', { tool: name, arguments: args });
  const page = await ensureBrowser();

  switch (name) {
    case "puppeteer_connect_active_tab":
      try {
        const wsEndpoint = await getDebuggerWebSocketUrl(args.debugPort);
        await connectToExistingBrowser(wsEndpoint, args.targetUrl);
        return {
          content: [{
            type: "text",
            text: `Successfully connected to browser${args.targetUrl ? ` and found tab with URL ${args.targetUrl}` : ''}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to connect to browser: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_navigate":
      try {
        logger.info('Navigating to URL', { url: args.url });
        const response = await page.goto(args.url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        if (!response) {
          throw new Error('Navigation failed - no response received');
        }

        const status = response.status();
        if (status >= 400) {
          throw new Error(`HTTP error: ${status} ${response.statusText()}`);
        }

        logger.info('Navigation successful', { url: args.url, status });
        return {
          content: [{
            type: "text",
            text: `Successfully navigated to ${args.url} (Status: ${status})`,
          }],
          isError: false,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Navigation failed', { url: args.url, error: errorMessage });
        return {
          content: [{
            type: "text",
            text: `Navigation failed: ${errorMessage}\nThis could be due to:\n- Network connectivity issues\n- Site blocking automated access\n- Page requiring authentication\n- Navigation timeout\n\nTry using a different URL or checking network connectivity.`,
          }],
          isError: true,
        };
      }

    case "puppeteer_screenshot": {
      const width = args.width ?? 800;
      const height = args.height ?? 600;
      await page.setViewport({ width, height });

      const screenshot = await (args.selector ?
        (await page.$(args.selector))?.screenshot({ encoding: "base64" }) :
        page.screenshot({ encoding: "base64", fullPage: false }));

      if (!screenshot) {
        return {
          content: [{
            type: "text",
            text: args.selector ? `Element not found: ${args.selector}` : "Screenshot failed",
          }],
          isError: true,
        };
      }

      screenshots.set(args.name, screenshot as string);
      server.notification({
        method: "notifications/resources/list_changed",
      });

      return {
        content: [
          {
            type: "text",
            text: `Screenshot '${args.name}' taken at ${width}x${height}`,
          } as TextContent,
          {
            type: "image",
            data: screenshot,
            mimeType: "image/png",
          } as ImageContent,
        ],
        isError: false,
      };
    }

    case "puppeteer_click":
      try {
        await page.click(args.selector);
        return {
          content: [{
            type: "text",
            text: `Clicked: ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to click ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_fill":
      try {
        await page.waitForSelector(args.selector);
        await page.type(args.selector, args.value);
        return {
          content: [{
            type: "text",
            text: `Filled ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to fill ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_select":
      try {
        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        return {
          content: [{
            type: "text",
            text: `Selected ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to select ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_hover":
      try {
        await page.waitForSelector(args.selector);
        await page.hover(args.selector);
        return {
          content: [{
            type: "text",
            text: `Hovered ${args.selector}`,
          }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    case "puppeteer_evaluate":
      try {
        await page.evaluate(() => {
          window.mcpHelper = {
            logs: [],
            originalConsole: { ...console },
          };

          ['log', 'info', 'warn', 'error'].forEach(method => {
            (console as any)[method] = (...args: any[]) => {
              window.mcpHelper.logs.push(`[${method}] ${args.join(' ')}`);
              (window.mcpHelper.originalConsole as any)[method](...args);
            };
          } );
        } );

        const result = await page.evaluate( args.script );

        const logs = await page.evaluate(() => {
          Object.assign(console, window.mcpHelper.originalConsole);
          const logs = window.mcpHelper.logs;
          delete ( window as any).mcpHelper;
          return logs;
        });

        return {
          content: [
            {
              type: "text",
              text: `Execution result:\n${JSON.stringify(result, null, 2)}\n\nConsole output:\n${logs.join('\n')}`,
            },
          ],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Script execution failed: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }

    default:
      return {
        content: [{
          type: "text",
          text: `Unknown tool: ${name}`,
        }],
        isError: true,
      };
  }
}

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
  },
);


// Setup request handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "console://logs",
      mimeType: "text/plain",
      name: "Browser console logs",
    },
    ...Array.from(screenshots.keys()).map(name => ({
      uri: `screenshot://${name}`,
      mimeType: "image/png",
      name: `Screenshot: ${name}`,
    })),
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === "console://logs") {
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: consoleLogs.join("\n"),
      }],
    };
  }

  if (uri.startsWith("screenshot://")) {
    const name = uri.split("://")[1];
    const screenshot = screenshots.get(name);
    if (screenshot) {
      return {
        contents: [{
          uri,
          mimeType: "image/png",
          blob: screenshot,
        }],
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {})
);

async function runServer() {
  logger.info('Starting MCP server');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server started successfully');
}

runServer().catch((error) => {
  // Use console.error for critical startup errors
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.stdin.on("close", () => {
  // Use console.error for shutdown message
  console.error("Puppeteer MCP Server closing");
  server.close();
});
