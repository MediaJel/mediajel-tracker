import { TagContext } from "../../../shared/types";

const dutchieSubdomainTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  function dataLayerListener(dataLayerEvent) {
    const response = JSON.parse(dataLayerEvent)
    const event = response.detail.event;
    const transaction = response.detail.ecommerce;
    const products = transaction.items;

    // TODO: REMOVE CONSOLE LOGS AFTER TESTING
    console.log(`event: ${ event }`);
    console.log(`ecommerce: ${ JSON.stringify(transaction) }`);

    if (event === "add_to_cart") {
      const { item_id, item_name, item_category, price, quantity } = products;

      window.tracker(
        "trackAddToCart",
        item_id.toString(),
        (item_name || "N/A").toString(),
        (item_category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (event === "remove_from_cart") {
      const { item_id, item_name, item_category, price, quantity } = products;

      window.tracker(
        "trackRemoveFromCart",
        item_id.toString(),
        (item_name || "N/A").toString(),
        (item_category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (event === "purchase") {
      const { transaction_id, value } = transaction;
      
      // Hardcoded because most fields are empty
      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseFloat(value),
        0,
        0,
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      products.forEach(items => {
        const { item_id, item_name, item_category, price, quantity } = items;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          item_id.toString(),
          (item_name || "N/A").toString(),
          (item_category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });

      window.tracker('trackTrans');
    }
  }

  // Whenever something is pushed, creates an event and dispatches that.
  // Listens from every file to this event to act on whenever a value is added to the dataLayer array.
  window.dataLayer = window.dataLayer || new Proxy([], {
    set: (obj, prop, value) => {  
      if (prop !== 'length') {
        const pushEvent = new CustomEvent('datalayerpush', {
          detail: value
        });
  
        window.dispatchEvent(pushEvent);
      }
      
      return Reflect.set(obj, prop, value);
    }
  });
  
  window.addEventListener('datalayerpush', dataLayerListener, false);
};

export default dutchieSubdomainTracker;