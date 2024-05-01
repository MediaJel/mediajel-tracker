import { errorTrackingSource } from "../../../shared/sources/error-tracking-source";
import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const grassDoorTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  datalayerSource((data: any): void => {
    errorTrackingSource(() => {
      if (data.event === "Product Added") {
        const products = data;
        const { sku, name, price, quantity, category } = products;

        window.tracker("trackAddToCart", {
          sku: sku.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        });
      }

      if (data.event === "Product Removed") {
        const products = data;
        const { sku, name, price, quantity, category } = products;

        window.tracker("trackRemoveFromCart", {
          sku: sku.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        });
      }

      if (data.event === "Order Made") {
        const transaction_id = data.order_id;
        const transaction_total = data.revenue;
        const transaction_tax = data.tax;
        const transaction_shipping = data.shipping;
        const products = data.products;

        // Hardcoded because most fields are empty
        window.tracker("addTrans", {
          orderId: transaction_id.toString(),
          affiliation: retailId ?? appId,
          total: parseFloat(transaction_total || 0),
          tax: parseFloat(transaction_tax || 0),
          shipping: parseFloat(transaction_shipping || 0),
          city: "N/A",
          state: "N/A",
          country: "N/A",
          currency: "USD",
        });

        products.forEach((items) => {
          const { product_id, name, price, quantity, category } = items;

          window.tracker("addItem", {
            orderId: transaction_id.toString(),
            sku: product_id.toString(),
            name: (name || "N/A").toString(),
            category: (category || "N/A").toString(),
            price: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          });
        });

        window.tracker("trackTrans");
      }
    });
  });
};

export default grassDoorTracker;
