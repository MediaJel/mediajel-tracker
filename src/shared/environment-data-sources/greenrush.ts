import { xhrResponseSource } from "../sources/xhr-response-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const greenrushDataSource = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<EnvironmentEvents>) => {
  xhrResponseSource((xhr: XMLHttpRequest) => {
    try {
      const response = xhr.responseText;

      if (xhr.responseURL.includes("cart") && xhr.response.includes("pending")) {
        const transaction = JSON.parse(response);
        const product = transaction.data.items.data;

        transactionEvent({
          id: transaction.data.id.toString(),
          city: "N/A",
          country: "USA",
          currency: "USD",
          shipping: 0,
          state: "N/A",
          tax: parseFloat(transaction.data.tax),
          total: parseFloat(transaction.data.total),
          items: product.map((item: any) => {
            return {
              orderId: transaction.data.id.toString(),
              category: item.category.toString(),
              currency: "USD",
              name: item.name.toString(),
              quantity: parseInt(item.quantity),
              sku: item.id.toString(),
              unitPrice: parseFloat(item.price),
            } as TransactionCartItem;
          }),
        });
      }
    } catch (error) {
      window.tracker('trackError', error, 'GREENRUSH');
    }
  });
};

export default greenrushDataSource;
