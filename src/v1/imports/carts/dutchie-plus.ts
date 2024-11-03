import { createSegments } from 'src/shared/segment-builder';
import { SnowplowTracker } from 'src/shared/snowplow';

import dutchiePlusDataSource, {
    dutchiePlusDataSourceObservable
} from '../../../shared/environment-data-sources/dutchie-plus';
import { QueryStringContext } from '../../../shared/types';

const dutchiePlusTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,

  tracker: SnowplowTracker
): void => {
  dutchiePlusDataSourceObservable.subscribe(({ transactionEvent: transactionData }) => {
    console.log("🚀🚀🚀 Snowplow Dutchie Transaction Event ", { transactionData });
    tracker.ecommerce.trackTransaction(transactionData);
    // window.tracker(
    //   "addTrans",
    //   transactionData.id,
    //   retailId ?? appId,
    //   transactionData.total,
    //   transactionData.tax,
    //   transactionData.shipping,
    //   transactionData.city,
    //   transactionData.state,
    //   transactionData.country,
    //   transactionData.currency
    // );

    // transactionData.items.forEach((item) => {
    //   window.tracker(
    //     "addItem",
    //     transactionData.id,
    //     item.sku,
    //     item.name,
    //     item.category,
    //     item.unitPrice,
    //     item.quantity,
    //     transactionData.currency
    //   );
    // });
    // window.tracker("trackTrans");

    // segments.nexxen.emitPurchase({
    //   bprice: transactionData.total,
    //   cid: transactionData.id,
    // });

    // segments.dstillery.emitPurchase({
    //   orderId: transactionData.id,
    //   amount: transactionData.total,
    // });
  });
  dutchiePlusDataSource({
    addToCartEvent(addToCartData) {
      window.tracker(
        "trackAddToCart",
        addToCartData.sku,
        addToCartData.name,
        addToCartData.category,
        addToCartData.unitPrice,
        addToCartData.quantity,
        addToCartData.currency
      );
    },
    removeFromCartEvent(removeFromCartData) {
      window.tracker(
        "trackRemoveFromCart",
        removeFromCartData.sku,
        removeFromCartData.name,
        removeFromCartData.category,
        removeFromCartData.unitPrice,
        removeFromCartData.quantity,
        removeFromCartData.currency
      );
    },
    // transactionEvent(transactionData) {
    //   window.tracker(
    //     "addTrans",
    //     transactionData.id,
    //     retailId ?? appId,
    //     transactionData.total,
    //     transactionData.tax,
    //     transactionData.shipping,
    //     transactionData.city,
    //     transactionData.state,
    //     transactionData.country,
    //     transactionData.currency
    //   );

    //   transactionData.items.forEach((item) => {
    //     window.tracker(
    //       "addItem",
    //       transactionData.id,
    //       item.sku,
    //       item.name,
    //       item.category,
    //       item.unitPrice,
    //       item.quantity,
    //       transactionData.currency
    //     );
    //   });
    //   window.tracker("trackTrans");

    //   segments.nexxen.emitPurchase({
    //     bprice: transactionData.total,
    //     cid: transactionData.id,
    //   });

    //   segments.dstillery.emitPurchase({
    //     orderId: transactionData.id,
    //     amount: transactionData.total,
    //   });
    // },
  });
};

export default dutchiePlusTracker;
