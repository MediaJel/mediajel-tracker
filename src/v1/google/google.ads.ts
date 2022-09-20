import { GoogleAdsParams } from "../../shared/types";

const createGoogleAds = (context: GoogleAdsParams) => {
  // Fail fast if the required params are not present
  if (!context.conversionId || !context.conversionLabel) {
    console.error("Conversion ID and Conversion Label are required for Google Ads");
    return;
  }

  let conversionId = context.conversionId;

  if (!conversionId.includes("AW-")) {
    conversionId = `AW-${conversionId}`;
  }

  document.createElement("script").src = `https://www.googletagmanager.com/gtag/js?id=${context.conversionId}`;

  window.dataLayer = window.dataLayer || [];

  const gtag = (...args) => window.dataLayer.push(args);

  gtag("js", new Date());
  gtag("config", conversionId);

  if (context.conversionLabel) {
    gtag("event", "conversion", {
      send_to: `${conversionId}/${context.conversionLabel}`,
      value: context.value ?? 1.0,
      currency: context.currency ?? "USD",
      transaction_id: context.transactionId ?? "",
    });
  }

  console.log(window.dataLayer);
};

export default createGoogleAds;
