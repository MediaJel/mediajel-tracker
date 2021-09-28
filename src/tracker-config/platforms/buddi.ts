import { EcommerceContext } from "../../interface";

export default function dutchieIframeTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  (function () {
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener('load', function () {
        var response = this.responseText;
        if (
          this.responseURL.includes('cart') &&
          !this.response.includes('delete')
        ) {
          var product = JSON.parse(response);
          window.tracker(
            'trackAddToCart',
            product.id.toString(),
            product.name,
            'N/A',
            product.price,
            product.qty,
            'USD'
          );
        } else if (this.responseURL.includes('orders')) {
          var transaction = JSON.parse(response);
          var product = transaction.products;
          window.tracker(
            'addTrans',
            transaction.id,
            !retailId ? appId : retailId,
            transaction.total,
            parseInt(transaction.tax),
            0,
            'N/A',
            'N/A',
            'USA',
            'US'
          );

          for (var i = 0, l = product.length; i < l; i++) {
            var item = product[i];

            window.tracker(
              'addItem',
              transaction.id,
              item.product_id,
              item.product.name,
              item.product.subcategory,
              item.price,
              item.qty,
              'US'
            );
          }

          window.tracker('trackTrans');
        }
      });
      origOpen.apply(this, arguments);
    };
  })();
}