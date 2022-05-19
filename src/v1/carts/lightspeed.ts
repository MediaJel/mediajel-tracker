import { Transactions } from "../../shared/types";

const lightspeedTracker = ({
  appId,
  retailId,
}: Pick<Transactions, "appId" | "retailId">) => {
  if (!window.lightspeedTransaction) return;
  else {
    const transaction = window.lightspeedTransaction;
    const products = transaction.products;

    window.tracker(
      "addTrans",
      transaction.orderNumber.toString(),
      !retailId ? appId : retailId,
      parseFloat(transaction.orderTotal),
      parseFloat(transaction.orderTax ? transaction.orderTax : 0),
      parseFloat(transaction.orderShipping ? transaction.orderShipping : 0),
      (transaction.orderCity ? transaction.orderCity : "N/A").toString(),
      (transaction.orderRegion ? transaction.orderRegion : "N/A").toString(),
      (transaction.orderCountry ? transaction.orderCountry : "N/A").toString(),
      (transaction.orderCurrency ? transaction.orderCurrency : "USD").toString()
    );

    for (let i = 0; i < products.length; ++i) {
      window.tracker(
        "addItem",
        transaction.orderNumber.toString(),
        products[i].productId.toString(),
        (products[i].productName ? products[i].productName : "N/A").toString(),
        (products[i].productCategory ? products[i].productCategory : "N/A").toString(),
        parseFloat(products[i].productPrice),
        parseInt(products[i].productQuantity ? products[i].productQuantity : 1),
        (transaction.orderCurrency ? transaction.orderCurrency : "USD").toString()
      );
    }

    window.tracker("trackTrans");
  }
};

export default lightspeedTracker;
