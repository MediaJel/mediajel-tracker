import { Transactions } from "../../../shared/types";

const tymberTracker = ({
  appId,
  retailId,
}: Pick<Transactions, "appId" | "retailId">) => {
  (function () {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        const response = this.responseText;

        if (this.responseURL.includes("?delivery_type=")) {
          const responseData = JSON.parse(response);

          if (!responseData.data) return;
          if (responseData.data.type === "orders") {
            const transaction = responseData.data.attributes;
            const products = responseData.included;
            window.tracker(
              "addTrans",
              transaction.order_number.toString(),
              !retailId ? appId : retailId,
              parseFloat(transaction.total.amount) / 100,
              parseFloat(transaction.tax_total.amount || 0) / 100,
              parseFloat(transaction.delivery_fee.amount || 0) / 100,
              (transaction.delivery_address.city || "N/A").toString(),
              (transaction.delivery_address.state || "N/A").toString(),
              (transaction.delivery_address.country || "US").toString(),
              (transaction.total.currency || "USD").toString()
            );

            for (let i = 0; i < products.length; ++i) {
              if (products[i].type === "products") {
                const item = products[i].attributes;
                window.tracker(
                  "addItem",
                  transaction.order_number.toString(),
                  (item.sku || item.id).toString(),
                  (item.name || "N/A").toString(),
                  (item.flower_type || "N/A").toString(),
                  parseFloat(item.unit_price.amount || 0) / 100,
                  parseFloat(item.unit_prices.quantity || 1),
                  (transaction.total.currency || "USD").toString()
                );
              }
            }

            window.tracker("trackTrans");
          }
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
};
export default tymberTracker;
