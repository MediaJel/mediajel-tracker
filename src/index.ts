import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";
// import { getCustomTags } from "./shared/utils/get-custom-tags";

const createStagingTag = (appId: string) => {
  console.log("Beta Domain Detected: ", window.location.hostname);
  const mjStaging = document.createElement("script");
  mjStaging.type = "text/javascript";
  mjStaging.src = `https://staging-tags.attentionsignals.net/?appId=${appId + "staging"}`;
  document.head.appendChild(mjStaging);
};

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    const domains = [
      "www.budhut.net",
      "seaweedmaine.com",
      "www.seaweedmaine.com",
      "www.budmary.com",
      "budmary.com",
      "kushcartpdx.com",
      "mmdshops.com",
    ];

    document.addEventListener("DOMContentLoaded", () => {
      if (domains.includes(window.location.hostname)) {
        createStagingTag(context.appId);
      }
    });

    console.log("MJ Tag Context", context);

    // Load plugin
    if (context.plugin) {
      import("./plugins").then(({ default: load }): void => load(context));
    }

    // Return early if the appId is not specified
    if (context.plugin && !context.appId) return;

    // Validations
    if (!context.appId) throw new Error("appId is required");

    switch (context.version) {
      case "1":
        import("./v1").then(({ default: load }) => load(context));
        break;
      case "2":
        import("./v2").then(({ default: load }) => load(context));
        break;
    }
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
