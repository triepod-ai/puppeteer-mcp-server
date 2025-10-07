import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS: Tool[] = [
  {
    name: "puppeteer_connect_active_tab",
    description: "Connect to an existing Chrome browser instance with remote debugging enabled. Use this tool to attach to a Chrome browser that's already running with the --remote-debugging-port flag. This allows you to control an active browser session rather than launching a new one. Prerequisite: Chrome must be running with remote debugging enabled (e.g., chrome --remote-debugging-port=9222). Returns the active tab's title and URL upon successful connection.",
    inputSchema: {
      type: "object",
      properties: {
        targetUrl: {
          type: "string",
          description: "Optional URL of the specific browser tab to connect to (e.g., 'https://example.com'). If provided, the tool will search for and connect to the first tab matching this URL. If omitted, connects to the first available tab in the browser. Useful when multiple tabs are open and you need to target a specific one."
        },
        debugPort: {
          type: "number",
          description: "Chrome remote debugging port number. Default is 9222, which is the standard Chrome debugging port. Only change this if Chrome was started with a custom port (e.g., --remote-debugging-port=9223). Valid range: 1024-65535.",
          default: 9222
        }
      },
      required: [],
    },
  },
  {
    name: "puppeteer_navigate",
    description: "Navigate the browser to a specified URL. This tool loads a new page and waits for the network to be idle before returning, ensuring the page is fully loaded. Waits up to 30 seconds for navigation to complete. Use this as the first step before interacting with page elements. Returns the HTTP status code and success confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to. Must be a fully-qualified URL including protocol. Supported protocols: http://, https://, file://. Examples: 'https://example.com', 'http://localhost:3000', 'https://github.com/user/repo'. The navigation waits for networkidle0 state (no network connections for 500ms) with a 30-second timeout."
        },
      },
      required: ["url"],
    },
  },
  {
    name: "puppeteer_screenshot",
    description: "Capture a screenshot of the current page or a specific element. Screenshots are stored in memory with the provided name and can be retrieved via the screenshot:// resource URI. Returns both a text confirmation and the base64-encoded PNG image. The viewport is automatically resized to the specified dimensions before capturing. Use this tool to visually verify page state, capture UI elements, or document page content.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Unique identifier name for this screenshot. Used to store and retrieve the screenshot via the screenshot://{name} resource URI. Choose descriptive names like 'login-page', 'error-state', or 'main-dashboard'. Names can contain alphanumeric characters, hyphens, and underscores."
        },
        selector: {
          type: "string",
          description: "Optional CSS selector to capture only a specific element instead of the full page. Examples: '#main-content' (by ID), '.header' (by class), 'button[type=\"submit\"]' (by attribute), 'nav > ul > li:first-child' (complex selector). If omitted, captures the visible viewport. The element must exist and be visible, or the tool will return an error."
        },
        width: {
          type: "number",
          description: "Viewport width in pixels for the screenshot. Default: 800. Common values: 375 (mobile), 768 (tablet), 1024 (laptop), 1920 (desktop). The browser viewport is resized to these dimensions before capturing. Valid range: 100-3840."
        },
        height: {
          type: "number",
          description: "Viewport height in pixels for the screenshot. Default: 600. Common values: 667 (mobile), 1024 (tablet), 768 (laptop), 1080 (desktop). The browser viewport is resized to these dimensions before capturing. Valid range: 100-2160."
        },
      },
      required: ["name"],
    },
  },
  {
    name: "puppeteer_click",
    description: "Click on an element in the browser page. This simulates a user mouse click on the specified element. The tool automatically waits for the element to be present in the DOM before attempting to click. Use this for buttons, links, checkboxes, radio buttons, or any clickable element. Returns success confirmation or error if element not found.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector identifying the element to click. Examples: 'button#submit' (button with ID), '.login-btn' (class name), 'a[href=\"/logout\"]' (link by href), 'input[type=\"checkbox\"]' (checkbox), 'div.modal button:last-child' (nested element). The selector must uniquely identify a clickable element. If multiple elements match, clicks the first one."
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_fill",
    description: "Fill an input field with text by simulating keyboard typing. This tool waits for the input element to be present, then types the provided text character by character (simulating human typing). Works with text inputs, textareas, and contenteditable elements. Does not clear existing content first - use evaluate() with .value = '' if you need to clear first. Returns success confirmation with the filled value.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector identifying the input field to fill. Examples: 'input[name=\"username\"]' (by name attribute), '#email' (by ID), 'textarea.comment-box' (textarea by class), 'input[type=\"password\"]' (by type), 'form.login input:first-child' (first input in form). Must target an element that accepts text input."
        },
        value: {
          type: "string",
          description: "The text value to type into the input field. Supports any string including special characters, numbers, and whitespace. Examples: 'user@example.com', 'My secure password 123!', 'Multi-line\\ntext content'. Text is typed character-by-character to simulate realistic user input and trigger input events."
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_select",
    description: "Select an option from a dropdown <select> element. This tool waits for the select element to be present, then chooses the option matching the provided value attribute. Triggers change events just like a user interaction. Use this for dropdown menus, comboboxes, and select elements. Returns success confirmation with the selected value.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector identifying the <select> dropdown element. Examples: 'select[name=\"country\"]' (by name), '#language-picker' (by ID), 'select.form-control' (by class), 'form select:nth-of-type(2)' (second select in form). Must target a <select> element, not an <option>."
        },
        value: {
          type: "string",
          description: "The value attribute of the <option> to select (not the visible text). Example: if HTML is <option value=\"us\">United States</option>, use 'us' not 'United States'. To find the correct value, inspect the page HTML or use evaluate() to query option values. Common pattern: <option value=\"id123\">Display Text</option> requires value='id123'."
        },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "puppeteer_hover",
    description: "Move the mouse cursor over an element to trigger hover effects. This simulates hovering without clicking, useful for revealing dropdown menus, tooltips, or other hover-triggered UI elements. The tool waits for the element to be present before hovering. The hover state persists until another action moves the mouse. Returns success confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector identifying the element to hover over. Examples: '.dropdown-trigger' (menu trigger), 'button[title=\"More options\"]' (button with title), '#tooltip-anchor' (element with tooltip), 'nav > li:nth-child(3)' (navigation item), '.card:hover' (hoverable card). Works with any visible element."
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "puppeteer_evaluate",
    description: "Execute arbitrary JavaScript code in the browser context. This runs code directly in the browser's JavaScript environment (not Node.js), with access to the DOM, window object, and page APIs. The code executes in an async context and can return serializable values (primitives, objects, arrays). Console output is captured and returned. Use this for complex interactions, data extraction, or custom logic that other tools don't support. Returns the execution result as JSON and any console output.",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "JavaScript code to execute in the browser context. Has access to: document, window, DOM APIs, and any page-loaded libraries (jQuery, etc). Return values must be JSON-serializable (no functions, DOM nodes, or circular references). Examples: 'return document.title' (get page title), 'return Array.from(document.querySelectorAll(\"a\")).map(a => a.href)' (extract all links), 'document.querySelector(\"#theme\").value = \"dark\"' (set value without return). Console.log/error/warn output is captured and returned separately."
        },
      },
      required: ["script"],
    },
  },
];
