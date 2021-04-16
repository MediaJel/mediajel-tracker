//Changes I made
//Infrastructure work = Parcel.js
//Next steps
//CollectorURL
//Multiple dev environments
//Multiple args
//Routes

//Dependencies???
//Code Tour
//Gitpod

//Identifiers &  variables
let scripts = document.getElementsByTagName('script');
let executeTracking = false;
let mediajelAppId = null;

//Loops over all scripts & collects scripts with arguments.
for (let i = 0, len = scripts.length; i < len; i++) {
  let src = scripts[i].getAttribute('src').split('?');
  let args = src[1];
  let argv = args.split('&');
  //Loops over all results & collects value of argument "mediajelAppId"
  for (let j = 0, argc = argv.length; j < argc; j++) {
    let pair = argv[j].split('=');
    let argName = pair[0];
    if (argName === 'mediajelAppId') {
      executeTracking = true;
      mediajelAppId = pair[1];
    }
  }

  if (!args) {
    continue;
  }
}

//Executes page tracking if argument is not null
if (mediajelAppId !== null) {
  //Pageview SDK
  (function (e, n, o, a, t, c, i) {
    if (!e[t]) {
      e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
      e.GlobalSnowplowNamespace.push(t);
      e[t] = function () {
        (e[t].q = e[t].q || []).push(arguments);
      };
      e[t].q = e[t].q || [];
      c = n.createElement(o);
      i = n.getElementsByTagName(o)[0];
      c.async = 1;
      c.src = a;
      i.parentNode.insertBefore(c, i);
    }
  })(
    window,
    document,
    'script',
    'http://drta3gpwmg66h.cloudfront.net/sp.js',
    `mediajelAppId`
  );
  window.mediajelAppId('newTracker', 'cf', '//collector.dmp.mediajel.ninja', {
    appId: `${mediajelAppId}`,
    discoverRootDomain: true,
  });
  window.mediajelAppId('enableActivityTracking', 30, 10);
  window.mediajelAppId('trackPageView');

  //Ecommerce tracking
  window.addEventListener('message', receiveMessage, false);
  function receiveMessage(event) {
    //Jane
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
