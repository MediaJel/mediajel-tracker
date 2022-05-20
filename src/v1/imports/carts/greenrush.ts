import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({
  appId,
  retailId,
}: Pick<QueryStringContext, "appId" | "retailId">) => {
  (function () {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        var response = this.responseText;
        if (
          this.responseURL.includes("cart") &&
          this.response.includes("pending")
        ) {
          var transaction = JSON.parse(response.data);
          var product = transaction.items.data;
          window.tracker(
            "addTrans",
            transaction.id,
            !retailId ? appId : retailId,
            parseInt(transaction.total),
            parseInt(transaction.tax),
            0,
            "N/A",
            "N/A",
            "USA",
            "US"
          );
          for (var i = 0, l = product.length; i < l; i++) {
            var item = product[i];
            window.tracker(
              "addItem",
              transaction.id,
              item.id,
              item.name,
              item.subcategory,
              item.price,
              item.quantity,
              "US"
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
