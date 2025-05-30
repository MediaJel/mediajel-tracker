import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { pollForElement } from "../sources/utils/poll-for-element";
import { TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

// TODO: Maybe remove the success = true; and the if (!success) block
const ecwidTracker = () => {
  let success = false;

  try {
    if (!window.transactionOrder && !window.transactionItems) {
      return;
    }

    const transaction = tryParseJSONObject(window.transactionOrder);
    const products = tryParseJSONObject(window.transactionItems);

    observable.notify({
      enhancedTransactionEvent: {
        ids: [transaction.id.toString()],
        id: transaction.id.toString(),
        total: parseFloat(transaction.total),
        tax: parseFloat(transaction.tax) || 0,
        shipping: parseFloat(transaction.delivery_fee) || 0,
        city: "N/A",
        state: "N/A",
        country: "USA",
        currency: "USD",
        items: products.map((product) => {
          const { item_id, item_name, item_category, price, quantity } = product;
          return {
            orderId: transaction.id.toString(),
            productId: item_id.toString(),
            sku: item_id.toString(),
            name: (item_name || "N/A").toString(),
            category: (item_category || "N/A").toString(),
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          } as TransactionCartItem;
        }),
      },
    });

    success = true;
  } catch (error) {
    logger.info("trackError", JSON.stringify(error), "ECWID IMPLEMENTATION 1");
  }

  // In the instance the above code doesn't work, the code below will execute since the if statement is true.

  if (!success) {
    try {
      pollForElement(
        [
          ".ec-confirmation__number.ec-header-h5",
          ".ec-confirmation__order-confirmation-total",
          ".ec-cart-item__title",
          ".ec-cart-item__count-inner",
        ],
        () => {
          if (
            window.location.href.includes("/orderConfirmation") ||
            window.location.href.includes("/order-confirmation")
          ) {
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

            observable.notify({
              enhancedTransactionEvent: {
                ids: [id.toString()],
                id: id.toString(),
                total: parseFloat(total),
                tax: 0,
                shipping: 0,
                city: "N/A",
                state: "N/A",
                country: "USA",
                currency: "USD",
                items: products,
              },
            });
          }
        }
      );
    } catch (error) {
      logger.info("trackError", JSON.stringify(error), "ECWID IMPLEMENTATION 2");
    }
  }
};

export default ecwidTracker;
