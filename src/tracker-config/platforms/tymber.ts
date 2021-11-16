import { EcommerceContext } from "../../interface";

export default function tymberTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

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
            const item = products.attributes;
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

            for(let i = 0; i < products.length; ++i) {
              if (products[i].type === "products") {
                window.tracker("addItem",
                  transaction.order_number.toString(),
                  (item[i].sku || item[i].id).toString(),
                  (item[i].name ? products[i].title : "N/A").toString(),
                  (item[i].variant_title ? products[i].variant_title : "N/A").toString(),
                  parseFloat(products[i].price),
                  parseFloat(products[i].quantity ? products[i].quantity : 1),
                  (transaction.currency ? transaction.currency : "USD").toString()
                );
              }
            }

            window.tracker("trackTrans")
          }
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
}
