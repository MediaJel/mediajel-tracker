import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  if(window.location.pathname.includes("/checkout/order-received/") && window.location.search) {
    if(!window.transactionOrder && !window.transactionItems) return;
    const transaction = JSON.parse(window.transactionOrder);
    const products = JSON.parse(window.transactionItems);
    
    window.tracker("addTrans",
      transaction.id.toString(),
      !retailId ? appId : retailId,
      parseFloat(transaction.total),
      parseFloat(transaction.total_tax ? transaction.total_tax : 0),
      parseFloat(transaction.shipping_total ? transaction.shipping_total : 0),
      (transaction.billing.city ? transaction.billing.city : "N/A").toString(),
      (transaction.billing.state ? transaction.billing.state : "N/A").toString(),
      (transaction.billing.country ? transaction.billing.country : "N/A").toString(),
      (transaction.currency ? transaction.currency : "USD").toString(),
    );

    for(let i = 0; i < products.length; ++i) {
      window.tracker("addItem",
        transaction.id.toString(),
        products[i].product_id.toString(),
        (products[i].name ? products[i].name : "N/A").toString(),
        (products[i].category ? products[i].category : "N/A").toString(),
        parseFloat(products[i].total),
        parseFloat(products[i].quantity ? products[i].quantity : 1),
        (transaction.currency ? transaction.currency : "USD").toString()
      );
    }

    window.tracker('trackTrans');
  }
  else {
    return;
  }
}