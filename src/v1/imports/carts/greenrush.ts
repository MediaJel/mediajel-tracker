import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  (function () {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        var response = this.responseText;
        if (this.responseURL.includes("cart") && this.response.includes("pending")) {
          var transaction = JSON.parse(response);
          var product = transaction.data.items.data;
          window.tracker(
            "addTrans",
            transaction.data.id.toString(),
            !retailId ? appId : retailId,
            parseFloat(transaction.data.total),
            parseFloat(transaction.data.tax),
            0,
            "N/A",
            "N/A",
            "USA",
            "USD"
          );
          for (var i = 0, l = product.length; i < l; i++) {
            var item = product[i];
            window.tracker(
              "addItem",
              transaction.data.id.toString(),
              item.id.toString(),
              item.name.toString(),
              item.category.toString(),
              parseFloat(item.price),
              parseInt(item.quantity),
              "USD"
            );
          }
          window.tracker("trackTrans");
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
};

export default greenrushTracker;
