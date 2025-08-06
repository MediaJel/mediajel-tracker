import { createLogger } from "src/shared/logger";
import { QueryStringContext } from "src/shared/types";

const logger = createLogger("session-tracking");

const MAX_RETRY_ATTEMPTS = 50; // 5 seconds total (50 * 100ms)
const RETRY_INTERVAL_MS = 100;

/**
 * Wait for window.H to be available with exponential backoff
 */
const waitForHighlight = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkHighlight = () => {
      attempts++;

      // Check if H is available and properly initialized
      if (window && (window as any).H && typeof (window as any).H.init === "function") {
        logger.info("Highlight.run library loaded successfully");
        resolve((window as any).H);
        return;
      }

      if (attempts >= MAX_RETRY_ATTEMPTS) {
        const errorMsg = "Highlight.run failed to initialize after maximum retry attempts";
        logger.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      // Retry with exponential backoff (capped at 1 second)
      const nextInterval = Math.min(RETRY_INTERVAL_MS * Math.pow(1.1, attempts), 1000);
      setTimeout(checkHighlight, nextInterval);
    };

    checkHighlight();
  });
};

/**
 * Initialize session tracking with Highlight.run
 */
export const initializeSessionTracking = async (context: QueryStringContext): Promise<void> => {
  try {
    logger.info("Initializing session tracking", context);

    // Check if already initialized
    if ((window as any).H && typeof (window as any).H.identify === "function") {
      logger.warn("Highlight.run already initialized, skipping initialization");
      return;
    }

    // Create and append script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/highlight.run";
    script.async = true;

    // Handle script loading errors
    const scriptLoadPromise = new Promise<void>((resolve, reject) => {
      script.onload = () => {
        logger.info("Highlight.run script loaded");
        resolve();
      };

      script.onerror = (error) => {
        logger.error("Failed to load Highlight.run script", error);
        reject(new Error("Failed to load Highlight.run script"));
      };
    });

    document.head.appendChild(script);

    await scriptLoadPromise;

    const H = await waitForHighlight();


    H.init("ldwyk6kg", {
      environment: "production",
      version: "1.0.0",
      networkRecording: {
        enabled: true,
        recordHeadersAndBody: true,
        urlBlocklist: ["https://www.googleapis.com/identitytoolkit", "https://securetoken.googleapis.com"],
      },
    });


    H.identify(context.appId, context);

    logger.info("Session tracking initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize session tracking", error);
  }
};
