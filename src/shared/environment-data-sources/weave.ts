import { EnvironmentEvents, TransactionCartItem } from "../types";

const weaveDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  try {
    document.addEventListener("weave-analytics-event", (event: any) => {
      const data = event.detail.event;
      if (event.detail.event_name === "order_submit") {
        const products = data.items;
        transactionEvent({
          id: data.order_id.toString(),
          total: data.total.total / 100,
          tax: data.total.tax / 100 || 0,
          shipping: 0,
          city: "N/A",
          state: "N/A",
          country: "N/A",
          currency: "USD",
          items: products.map((product: any) => {
            return {
              orderId: data.order_id.toString(),
              productId: product.id.toString(),
              sku: product.id.toString(),
              name: product.name.toString(),
              category: product.category.toString(),
              unitPrice: product.price / 100 || 0,
              quantity: product.quantity / 1000 || 1,
              currency: "USD",
            } as TransactionCartItem;
          }),
        });
      }
    });
  } catch {}
};

export default weaveDataSource;
