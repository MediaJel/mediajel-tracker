import { createSegments, DstillerySegmentBuilderInput, NexxenSegmentBuilderInput } from "src/shared/segment-builder";
import { SnowplowTracker } from "src/shared/snowplow/types";
import { QueryStringContext } from "src/shared/types";

const setupExtension = (context: QueryStringContext): ReturnType<typeof createSegments> => {
  const liquidm = context.segmentId || context.s1;

  //* If s2.pv or s2.tr is not present, use context.s2 as default
  //* mainly used for legacy purposes
  const nexxen: NexxenSegmentBuilderInput = {
    pageVisitorBeaconId: context["s2.pv"] || context["s2"],
    transactionBeaconId: context["s2.tr"] || context["s2"],
  };

  const dstillery: DstillerySegmentBuilderInput = {
    siteVisitorNC: context["s3.pv"] || context["s3"],
    purchaseNC: context["s3.tr"] || context["s3"],
  };

  const segments = createSegments({
    //* Accept both segmentId and s1 for legacy purposes
    liquidm,
    nexxen,
    dstillery,
  });

  //* Expose cnnaSegments to the window object for custom integrations to use
  window.cnnaSegments = segments;

  liquidm && segments.liquidm.emit();
  nexxen && segments.nexxen.emit();
  dstillery && segments.dstillery.emit();

  return segments;
};

/**
 * This extension will send transaction events to our partner segments when a transaction is tracked
 */

const withSnowplowSegmentsExtension = (snowplow: SnowplowTracker) => {
  const segments = setupExtension(snowplow.context);

  // Original trackTransaction method
  const trackTransaction = snowplow.ecommerce.trackTransaction;
  const trackEnhancedTransaction = snowplow.ecommerce.trackEnhancedTransaction;

  //* Override the trackTransaction method
  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction(input);

    segments.nexxen.emitPurchase({
      bprice: input.total,
      cid: input.id,
    });

    segments.dstillery.emitPurchase({
      amount: input.total,
      orderId: input.id,
    });
  };

  snowplow.ecommerce.trackEnhancedTransaction = (input) => {
    trackEnhancedTransaction(input);

    //! What if we have multiple ids?
    segments.nexxen.emitPurchase({
      bprice: input.total,
      cid: input.ids[0] || input.id,
    });

    segments.dstillery.emitPurchase({
      amount: input.total,
      orderId: input.ids[0] || input.id,
    });
  };

  return snowplow;
};

export default withSnowplowSegmentsExtension;
