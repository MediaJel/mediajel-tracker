import { createLogger } from "src/shared/logger";
import { QueryStringContext } from "src/shared/types";

const logger = createLogger("session-tracking");

const SCRIPT_URL = "https://unpkg.com/@highlight-run/browser"; // Use the specific package
const MAX_RETRY_ATTEMPTS = 50;
const RETRY_INTERVAL_MS = 100;

/**
 * Check if Highlight is already loaded
 */
const isHighlightLoaded = (): boolean => {
  return !!(window as any).H && typeof (window as any).H.init === "function";
};

/**
 * Wait for window.H to be available
 */
const waitForHighlight = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkHighlight = () => {
      attempts++;

      if (isHighlightLoaded()) {
        console.info("Highlight.run library loaded successfully");
        resolve((window as any).H);
        return;
      }

      if (attempts >= MAX_RETRY_ATTEMPTS) {
        const errorMsg = "Highlight.run failed to initialize after maximum retry attempts";
        console.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      setTimeout(checkHighlight, RETRY_INTERVAL_MS);
    };

    checkHighlight();
  });
};

/**
 * Load the Highlight.run script
 */
const loadHighlightScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existingScript) {
      console.info("Highlight.run script already in DOM");
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = SCRIPT_URL;

    const timeout = setTimeout(() => {
      console.error("Script loading timeout");
      reject(new Error("Script loading timeout after 10 seconds"));
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      console.info("Highlight.run script element loaded");
      resolve();
    };

    script.onerror = (event) => {
      clearTimeout(timeout);
      console.error("Failed to load Highlight.run script", event);
      reject(new Error(`Failed to load script from ${SCRIPT_URL}`));
    };

    // Ensure document.body exists
    if (!document.body) {
      const errorMsg = "document.body is not available";
      console.error(errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    try {
      document.body.appendChild(script);
    } catch (error) {
      console.error("Error appending script to head", error);
      reject(error);
    }
  });
};

/**
 * Initialize session tracking with Highlight.run
 */
export const initializeSessionTracking = async (context: QueryStringContext): Promise<void> => {
  try {
    console.info("Starting session tracking initialization", context);

    // Check if already initialized
    if (isHighlightLoaded()) {
      console.info("Highlight.run already loaded, initializing with context");
      const H = (window as any).H;

      // Check if already initialized by looking for identify method
      if (typeof H.identify === "function") {
        H.identify(context.appId, context);
        console.info("Updated existing Highlight session with new context");
        return;
      }
    }

    // Load the script
    await loadHighlightScript();

    // Wait for Highlight to be available on window
    const H = await waitForHighlight();

    // Initialize Highlight
    try {
      H.init("ldwyk6kg", {
        environment: "production",
        version: "1.0.0",
        networkRecording: {
          enabled: true,
          recordHeadersAndBody: true,
          urlBlocklist: ["https://www.googleapis.com/identitytoolkit", "https://securetoken.googleapis.com"],
        },
      });

      // Identify the user/session
      H.identify(context.appId, context);

      console.info("Session tracking initialized successfully");
    } catch (initError) {
      console.error("Error during H.init or H.identify", initError);
      throw initError;
    }
  } catch (error) {
    console.error("Failed to initialize session tracking", error);
  }
};
