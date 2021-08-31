import { EcommerceContext } from "../../interface";

export default function cityCompassionateCaregiversTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  (function (ns, fetch) {
    if (typeof fetch !== "function") return;
    ns.fetch = function () {
      var out = fetch.apply(this, arguments);

      out.then(async (response) => {
        const clone = response.clone();
        await clone.text().then((res) => {
          const response = JSON.parse(res);
          const ecommerce = response.data.findOrder;
          const products = ecommerce.orderItems;

          if (!ecommerce) return;
          window.tracker(
            "addTrans",
            ecommerce.cartId.toString(),
            !retailId ? appId : retailId,
            ecommerce.total / 100,
            ecommerce.tax ?? 0,
            0,
            "N/A",
            "California",
            "USA",
            "USD"
          );

          for (let i = 0, l = products.length; i < l; i += 1) {
            const item = products[i];
            window.tracker(
              "addItem",
              ecommerce.cartId.toString(),
              item.id.toString(),
              item.menuItemName,
              "N/A",
              item.price / 100,
              item.quantity,
              "USD"
            );
          }
          window.tracker("trackTrans");
        });
      });
      return out;
    };
  })(window, window.fetch);
}