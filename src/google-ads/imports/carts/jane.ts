import { postMessageSource } from "../../../shared/sources/post-message-source";
import { GoogleAdsParams, SnowplowParams } from "../../../shared/types";

type Context = {
  gtag: (...args: any[]) => any;
} & GoogleAdsParams &
  Pick<SnowplowParams, "environment">;

const janeGoogleAds = (context: Context) => {
  postMessageSource((event: MessageEvent<any>): void => {
    const { payload, messageType } = event.data;

    if (!payload || messageType !== "analyticsEvent") {
      return;
    }

    if (payload.name === "checkout" || payload.name === "purchase") {
      const script = document.createElement("script");

      script.addEventListener("load", () => {
        console.log("Script created");
        context.gtag("event", "conversion", {
          send_to: `${context.conversionId}/${context.conversionLabel}`,
          value: parseFloat(payload.properties.estimatedTotal) ?? 1.0,
          currency: "USD",
          // transaction_id: payload.properties.cartId.toString() ?? "",
        });
      });
    }
  });
};

export default janeGoogleAds;
