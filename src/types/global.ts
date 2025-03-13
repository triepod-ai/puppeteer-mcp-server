declare global {
  interface Window {
    mcpHelper?: {
      logs: string[];
      originalLog: typeof console.log;
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
