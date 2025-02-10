declare global {
  interface Window {
    mcpHelper: {
      logs: string[],
      originalConsole: Partial<typeof console>,
    }
  }
}

// State types
export interface BrowserState {
  consoleLogs: string[];
  screenshots: Map<string, string>;
}

// Active tab types
export interface ActiveTab {
  page: import('puppeteer').Page;
  url: string;
  title: string;
}

// Export an empty object to make this a module
export {};
