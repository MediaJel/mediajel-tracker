import { EnvironmentEvents, TransactionCartItem } from "../types";

const dutchiePlusDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  window.dataLayer = window.dataLayer || [];

  // loop through the dataLayer and find the purchase event
  // then send the transactionEvent to the callback

  // if local storage is empty then send transactionEvent
  // if local storage: order id and current order id not the same then send transactionEvent
  // if window.locatoin.href includes 'order-confirmation'
  // important note: DUTCHIE-PLUS for curaleaf ONLY!!!

  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];
    console.log("logging dataLayer event:");
    console.log(data);
    if (data.event === "purchase") {
      const { id, revenue, tax } = data.ecommerce.purchase.actionField;
      const items = data.ecommerce.purchase.products;

      transactionEvent?.({
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
  }
};

export default dutchiePlusDataSource;
