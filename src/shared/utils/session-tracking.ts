import { QueryStringContext } from "src/shared/types";

export const initializeSessionTracking = (context: QueryStringContext): void => {
  console.log("initializeSessionTracking", context);
  const script = document.createElement("script");
  script.src = "https://unpkg.com/highlight.run";
  script.onload = () => {
    (window as any).H.init("ldwyk6kg", {
      environment: "production",
      version: "1.0.0",
      networkRecording: {
        enabled: true,
        recordHeadersAndBody: true,
        urlBlocklist: ["https://www.googleapis.com/identitytoolkit", "https://securetoken.googleapis.com"],
      },
    });

    (window as any).H.identify(context.appId, context);
  };

  document.head.appendChild(script);
};
