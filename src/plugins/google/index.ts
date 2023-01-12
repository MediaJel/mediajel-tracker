import { GoogleAdsPluginParams } from "../../shared/types";

const createGoogleAdsPlugin = (context: GoogleAdsPluginParams) => {
  // Fail fast if the required params are not present
  if (!context.conversionId || !context.conversionLabel) {
    console.warn("Conversion ID and Conversion Label are required for Google Ads");
  }

  if (!context.conversionId.includes("AW-")) {
    context.conversionId = `AW-${context.conversionId}`;
  }

  console.log(`🚀🚀🚀 Google Ads Plugin loaded for ${context.environment}`);
  console.log(`🚀🚀🚀 Google Ads Plugin params: ${JSON.stringify(context, null, 2)}`);

  document.createElement("script").src = `https://www.googletagmanager.com/gtag/js?id=${context.conversionId}`;

  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  window.gtag = gtag;
  /**Note: the @ts-ignore lines below are necessary to supress typescript warnings for the arguments object above */
  // @ts-ignore
  gtag("js", new Date());
  // @ts-ignore
  gtag("config", context.conversionId);

  // Cross domain tracking
  if (context.crossDomainSites) {
    const crossDomainSites = context.crossDomainSites.split(",");
    const sites = crossDomainSites.map((site) => site.trim());
    // @ts-ignore
    gtag("set", "linker", { domains: sites });
  }

  switch (context.environment) {
    case "jane": {
      import("./imports/carts/jane").then(({ default: load }) => load(context));
      break;
    }
    case "dutchie-iframe": {
      import("./imports/carts/dutchie-iframe").then(({ default: load }) => load(context));
      break;
    }
    case "dutchie-subdomain": {
      import("./imports/carts/dutchie-subdomain").then(({ default: load }) => load(context));
      break;
    }
    case "woocommerce": {
      import("./imports/carts/woocommerce").then(({ default: load }) => load(context));
      break;
    }
    case "shopify": {
      import("./imports/carts/shopify").then(({ default: load }) => load(context));
      break;
    }
    case "tymber": {
      import("./imports/carts/tymber").then(({ default: load }) => load(context));
      break;
    }
    case "greenrush": {
      import("./imports/carts/greenrush").then(({ default: load }) => load(context));
      break;
    }
    case "buddi": {
      import("./imports/carts/buddi").then(({ default: load }) => load(context));
      break;
    }
    case "ecwid": {
      import("./imports/carts/ecwid").then(({ default: load }) => load(context));
      break;
    }
    default: {
      console.warn("Google Ads plugin does not support this environment");
    }
  }
};

export default createGoogleAdsPlugin;
