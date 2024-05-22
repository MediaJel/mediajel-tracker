import { EnvironmentEvents, TransactionCartItem } from "../types";
import { pollForElement } from "../sources/poll-for-element";

const ecwidTracker = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }

  pollForElement(
    [
      ".ec-confirmation__number.ec-header-h5",
      ".ec-confirmation__order-confirmation-total",
      ".ec-cart-item__title",
      ".ec-cart-item__count-inner",
    ],
    () => {
      if (window.location.href.includes("/orderConfirmation") || window.location.href.includes("/order-confirmation")) {
        try {
          const idElement = document.querySelector(".ec-confirmation__number.ec-header-h5");
          const totalElement = document.querySelector(".ec-confirmation__order-confirmation-total");
          const nameElement = document.querySelector(".ec-cart-item__title");
          const quantityElement = document.querySelector(".ec-cart-item__count-inner");

          var id = idElement.textContent;
          var total = totalElement.textContent.replace("$", "");
          var name = nameElement.textContent;
          var quantity = quantityElement.textContent.replace("× ", "");

          const products: TransactionCartItem[] = [
            {
              orderId: id.toString(),
              sku: "N/A",
              name: (name || "N/A").toString(),
              category: "N/A",
              unitPrice: parseFloat(total) || 0,
              quantity: parseInt(quantity) || 1,
              currency: "USD",
            },
          ];

          transactionEvent({
            id: id.toString(),
            total: parseFloat(total),
            tax: 0,
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "USA",
            currency: "USD",
            items: products,
          });
        } catch (error) {
          window.tracker("trackError", JSON.stringify(error), "ECWID");
        }
      }
    }
  );
};

export default ecwidTracker;
