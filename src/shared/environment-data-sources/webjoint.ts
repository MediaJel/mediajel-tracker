import { xhrRequestSource } from "../sources/xhr-request-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const webjointDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  xhrRequestSource((data: any): void => {
    try {
      const parsedData = JSON.parse(data);

      if (parsedData && Object.keys(parsedData).includes("orders")) {
        transactionEvent({
          id: parsedData.orders[0].id || "N/A",
          total: parseFloat(parsedData.orders[0].total) || 0,
          tax: parseFloat(parsedData.orders[0].taxes) || 0,
          city: "N/A",
          country: "USA",
          currency: "USD",
          shipping: 0,
          state: "N/A",
          items: parsedData.orders[0].details.map((item: any) => {
            const { name, quantity } = item;
            return {
              orderId: parsedData.orders[0]["_id"].toString() || parsedData.orders[0].id.toString() || "N/A",
              category: "N/A".toString(),
              currency: "USD",
              name: (name || "N/A").toString(),
              quantity: parseFloat(quantity) || 1,
              sku: "N/A",
              unitPrice: 0,
            } as TransactionCartItem;
          }),
        });
      }
    } catch (error) {
      window.tracker("trackError", error, "WEBJOINT");
    }
  });
};

export default webjointDataSource;
