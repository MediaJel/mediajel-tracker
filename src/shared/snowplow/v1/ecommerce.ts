import { CreateSnowplowTrackerInput, SnowplowTrackerEcommerceEvents } from "src/shared/snowplow/types";

const createSnowplowV1TrackerEcommerceEventsHandlers = (
  input: CreateSnowplowTrackerInput,
): SnowplowTrackerEcommerceEvents => {
  const { appId, retailId } = input;
  return {
    trackTransaction: (input) => {
      window.tracker(
        `addTrans:${appId}`,
        input.id,
        retailId ?? appId,
        input.total,
        input.tax,
        input.shipping,
        input.city,
        input.state,
        input.country,
        input.currency,
      );

      input.items.forEach((item) => {
        window.tracker(
          `addItem:${appId}`,
          input.id,
          item.sku,
          item.name,
          item.category,
          item.unitPrice,
          item.quantity,
          input.currency,
        );
      });
      window.tracker(`trackTrans:${appId}`);
    },
    trackAddToCart: (input) => {
      window.tracker(
        "trackAddToCart",
        input.sku,
        input.name,
        input.category,
        input.unitPrice,
        input.quantity,
        input.currency,
      );
    },
    trackRemoveFromCart: (input) => {
      window.tracker(
        "trackRemoveFromCart",
        input.sku,
        input.name,
        input.category,
        input.unitPrice,
        input.quantity,
        input.currency,
      );
    },
  };
};

export default createSnowplowV1TrackerEcommerceEventsHandlers;
