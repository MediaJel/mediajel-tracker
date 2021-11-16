import { EcommerceContext } from "../../interface";

export default function tymberTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  (function () {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        var response = this.responseText;

        if (this.responseURL.includes("?delivery_type=")) {
          if(!responseData.data) return;
          var responseData = JSON.parse(response.data);
          
          if (responseData.type !== "orders") return;
          var transaction = responseData.attributes;
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

          window.tracker("trackTrans")
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
}
