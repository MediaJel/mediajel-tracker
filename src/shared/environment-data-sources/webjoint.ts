import { xhrRequestSource } from "../sources/xhr-request-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const webjointDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  xhrRequestSource((data: any): void => {
    const parsedData = JSON.parse(data);

    if (parsedData && Object.keys(parsedData).includes("orders")) {
      transactionEvent({
        id: parsedData.orders[0].id,
        total: parseFloat(parsedData.orders[0].total),
        tax: parseFloat(parsedData.orders[0].taxes),
        city: "N/A",
        country: "USA",
        currency: "USD",
        shipping: 0,
        state: "N/A",
        items: parsedData.orders[0].details.map((item: any) => {
          const { name, quantity } = item;
          return {
            orderId: parsedData.orders[0]["_id"],
            category: "N/A",
            currency: "USD",
            name,
            quantity,
            sku: "N/A",
            unitPrice: 0,
          } as TransactionCartItem;
        }),
      });
    }
  });
};

export default webjointDataSource;
