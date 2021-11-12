import { EcommerceContext } from "../../interface";

export default function tymberTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  (function () {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        var response = this.responseText;

        if (this.responseURL.includes("?delivery_type=")) {
          var responseData = JSON.parse(response.data);
          if (responseData.type === "orders") {
            var transaction = responseData.attributes;
            window.tracker(
              "addTrans",
              transaction.order_number.toString(),
              !retailId ? appId : retailId,
              parseFloat(transaction.total.amount) / 100,
              parseFloat(transaction.tax_total.amount || 0) / 100,
              parseFloat(transaction.delivery_fee.amount || 0) / 100,
              transaction.delivery_address.city.toString() || "N/A",
              transaction.delivery_address.state.toString() || "N/A",
              transaction.delivery_address.country.toString() || "US",
              transaction.total.currency.toString() || "USD"
            );

            window.tracker("trackTrans");
          }
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
}
