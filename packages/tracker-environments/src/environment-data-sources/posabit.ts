import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { datalayerSource } from "@mediajel/tracker-core/sources/google-datalayer-source";
import { isTrackerLoaded } from "@mediajel/tracker-core/sources/utils/is-tracker-loaded";
import { TransactionCartItem } from "@mediajel/tracker-core/types";

const posabitDataSource = () => {
  isTrackerLoaded(() => {
    datalayerSource((data: any) => {
      // Posabit menus push GA4 gtag args-style events: data["0"] = "event", data["1"] = name, data["2"] = payload
      if (data?.["0"] === "event" && data?.["1"] === "purchase") {
        const transaction = data["2"];
        const products = transaction?.items;
        if (!transaction || !Array.isArray(products)) return;

        const transactionId = transaction.transaction_id?.toString() || "N/A";

        observable.notify({
          transactionEvent: {
            id: transactionId,
            total: parseFloat(transaction.value) || 0,
            tax: parseFloat(transaction.tax) || 0,
            shipping: parseFloat(transaction.shipping) || 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: products.map(
              (item: any) =>
                ({
                  orderId: transactionId,
                  sku: item.item_id?.toString() || "N/A",
                  name: item.item_name?.toString() || "N/A",
                  category: "N/A",
                  unitPrice: parseFloat(item.price) || 0,
                  quantity: parseInt(item.quantity) || 1,
                  currency: "USD",
                }) as TransactionCartItem,
            ),
          },
        });
      }

      if (data?.["0"] === "event" && data?.["1"] === "add_to_cart") {
        const cart = data["2"];
        const products = cart?.items;
        if (!cart || !Array.isArray(products)) return;

        const currency = (cart.currency || "USD").toString();

        products.forEach((item: any) => {
          observable.notify({
            addToCartEvent: {
              sku: item.item_id?.toString() || "N/A",
              name: item.item_name?.toString() || "N/A",
              category: "N/A",
              unitPrice: parseFloat(item.price) || 0,
              quantity: parseInt(item.quantity) || 1,
              currency,
            },
          });
        });
      }
    });
  });
};

export default posabitDataSource;
