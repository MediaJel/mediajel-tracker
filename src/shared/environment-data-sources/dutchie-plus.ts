import { EnvironmentEvents, TransactionCartItem } from "../types";

const dutchiePlusDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  // IMPORTANT NOTE: dutchieplus cart CURALEAF is Paid search only & greenvalleydispensary is display
  window.dataLayer = window.dataLayer || [];

  // if window.locatoin.href includes 'order-confirmation'
  // if (!window.location.href.includes("order-confirmation")) {
  //   return;
  // }

  // loop through the dataLayer and find the purchase event
  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];
    if (data.event === "purchase") {
      // const orderContent: HTMLDivElement | any = document.getElementsByClassName("order-content")[0];
      // const text: string = orderContent?.innerText;
      // const regex = /#(\d+)/;
      // const orderNumber = text.match(regex)[1];

      // if (localStorage.getItem("orderNumber") === orderNumber) {
      //   return;
      // }

      // // set order id to local storage to prevent duplicate events
      // localStorage.setItem("orderNumber", orderNumber);

      const { id, revenue, tax } = data.ecommerce.purchase.actionField;
      const items = data.ecommerce.purchase.products;

      transactionEvent({
        total: parseFloat(revenue),
        id: id.toString(),
        tax: parseFloat(tax || 0),
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
        items: items.map((item) => {
          const { id, name, category, price, quantity } = item;

          return {
            orderId: id.toString(),
            sku: id.toString(),
            name: name?.toString() || "N/A",
            category: category?.toString() || "N/A",
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          } as TransactionCartItem;
        }),
      });
    }

    if (data[1] === "purchase") {
      try {
        const transactionData = data[2];
        const items = transactionData.items;

        transactionEvent({
          total: parseFloat(transactionData.value),
          id: transactionData.rawData.orderNumber,
          tax: parseFloat(transactionData.tax || 0),
          shipping: parseFloat(transactionData.shipping || 0),
          city: transactionData.city || "N/A",
          state: transactionData.state || "N/A",
          country: "USA",
          currency: "USD",
          items: items.map((item) => {
            return {
              orderId: transactionData.rawData.orderNumber,
              sku: item.item_id,
              name: item.item_name || "N/A",
              category: item.item_category || "N/A",
              unitPrice: parseFloat(item.price || 0),
              quantity: parseInt(item.quantity || 1),
              currency: "USD",
            } as TransactionCartItem;
          }),
        });
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'DUTCHIEPLUS');
      }
    }
  }
};

export default dutchiePlusDataSource;
