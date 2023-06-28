import { EnvironmentEvents, TransactionCartItem } from "../types";

const dutchiePlusDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  // important note: DUTCHIE-PLUS for curaleaf ONLY!!!
  window.dataLayer = window.dataLayer || [];

   // if window.locatoin.href includes 'order-confirmation'
   if (!window.location.href.includes('order-confirmation')){
    return;
  }

  const orderContent: HTMLDivElement | any = document.getElementsByClassName('order-content')[0];
  const text: string = orderContent?.innerText
  const regex = /#(\d+)/;
  const orderNumber = text.match(regex)[1];

  if (localStorage.getItem('orderNumber') !== orderNumber) {
    localStorage.setItem('orderNumber', orderNumber);
    console.log(orderNumber);
  }

  // loop through the dataLayer and find the purchase event
  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];
    console.log("logging dataLayer event:");
    console.log(data);
    
    // if local storage: order id and current order id not the same then send transactionEvent
    if (data.event === "purchase" && localStorage.getItem('orderNumber') !== orderNumber) {
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
