//To Add config here

export function JaneTracker(aid) {
  let mediajelAppId = aid;
  //Ecommerce tracking
  window.addEventListener('message', receiveMessage, false);
  function receiveMessage(event) {
    var payload = event.data && event.data.payload;
    if (!payload || event.data.messageType !== 'analyticsEvent') return;
    if (payload.name === 'checkout') {
      var subtotal = payload.properties.estimatedTotal;
      var cartId = payload.properties.cartId;
      var products = payload.properties.products;
      window.mediajelAppId(
        'addTrans',
        cartId,
        `${mediajelAppId}`,
        subtotal,
        '0',
        '0',
        'N/A',
        'California',
        'USA'
      );

      for (var i = 0, l = products.length; i < l; i++) {
        var item = products[i];

        window.mediajelAppId(
          'addItem',
          cartId,
          item.product_id,
          item.name,
          item.category,
          item.unit_price,
          item.count
        );
      }

      window.mediajelAppId('trackTrans');
    }
    if (payload.name === 'cartItemAdd') {
      var productIdToAdd = payload.properties.productId;
      var productToAdd = payload.properties.product;
      window.mediajelAppId(
        'trackAddToCart',
        productIdToAdd.toString(),
        productToAdd.name,
        productToAdd.category,
        productToAdd.unit_price ? productToAdd.unit_price : 0,
        productToAdd.count ? productToAdd.count : 1,
        'USD'
      );
    }
    if (payload.name === 'cartItemRemoval') {
      var productIdToRemove = payload.properties.productId;

      window.mediajelAppId(
        'trackRemoveFromCart',
        productIdToRemove.toString(),
        'N/A',
        'N/A',
        0,
        1,
        'USD'
      );
    }
  }
}
