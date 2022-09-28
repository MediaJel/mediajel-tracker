import { GoogleAdsPluginParams } from "../../shared/types";

const createGoogleAds = (context: GoogleAdsPluginParams) => {
  // Fail fast if the required params are not present
  if (!context.conversionId || !context.conversionLabel) {
    throw new Error("Conversion ID and Conversion Label are required for Google Ads");
  }

  let conversionId = context.conversionId;

  if (!conversionId.includes("AW-")) {
    conversionId = `AW-${conversionId}`;
  }

  document.createElement("script").src = `https://www.googletagmanager.com/gtag/js?id=${context.conversionId}`;

  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }
  /**Note: the @ts-ignore lines below are necessary to supress typescript warnings for the arguments object above */
  // @ts-ignore
  gtag("js", new Date());
  // @ts-ignore
  gtag("config", conversionId);

  switch (context.environment) {
    case "jane": {
      import("./imports/carts/jane").then(({ default: load }) => load(context));
    }
  }
};

export default createGoogleAds;
