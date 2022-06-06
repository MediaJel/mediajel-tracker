import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  (function () {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        var response = this.responseText;
        if (response.includes("pending")) {
          var transaction = JSON.parse(response);
          var product = transaction.data.items.data;
          window.tracker(
            "addTrans",
            transaction.data.id.toString(),
            !retailId ? appId : retailId,
            parseInt(transaction.data.total),
            parseInt(transaction.data.tax),
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
              transaction.data.id.toString(),
              item.id.toString(),
              item.name,
              item.category,
              item.price,
              item.quantity,
              "US"
            );
          }
          window.tracker("trackTrans");
        } else {
          return;
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
};

export default greenrushTracker;
