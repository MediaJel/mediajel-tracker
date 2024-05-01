import { errorTrackingSource } from "../../../shared/sources/error-tracking-source";
import { QueryStringContext } from "../../../shared/types";

const lightspeedTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  errorTrackingSource(() => {
    if (!window.lightspeedTransaction) return;
    else {
      const transaction = window.lightspeedTransaction;
      const products = transaction.products;

      window.tracker("addTrans", {
        orderId: transaction.orderNumber.toString(),
        affiliation: !retailId ? appId : retailId,
        total: parseFloat(transaction.orderTotal),
        tax: parseFloat(transaction.orderTax ? transaction.orderTax : 0),
        shipping: parseFloat(transaction.orderShipping ? transaction.orderShipping : 0),
        city: (transaction.orderCity ? transaction.orderCity : "N/A").toString(),
        state: (transaction.orderRegion ? transaction.orderRegion : "N/A").toString(),
        country: (transaction.orderCountry ? transaction.orderCountry : "N/A").toString(),
        currency: (transaction.orderCurrency ? transaction.orderCurrency : "USD").toString(),
      });

      for (let i = 0; i < products.length; ++i) {
        window.tracker("addItem", {
          orderId: transaction.orderNumber.toString(),
          sku: products[i].productId.toString(),
          name: (products[i].productName ? products[i].productName : "N/A").toString(),
          category: (products[i].productCategory ? products[i].productCategory : "N/A").toString(),
          price: parseFloat(products[i].productPrice),
          quantity: parseInt(products[i].productQuantity ? products[i].productQuantity : 1),
          currency: (transaction.orderCurrency ? transaction.orderCurrency : "USD").toString(),
        });
      }

      window.tracker("trackTrans");
    }
  });
};

export default lightspeedTracker;
