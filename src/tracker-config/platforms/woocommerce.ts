import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  if(window.location.pathname.includes("/checkout/order-received/") && window.location.search) {
    const scripts = document.getElementById('universal');
    const transaction = JSON.parse(scripts.getAttribute('data-order'));
    const products = JSON.parse(scripts.getAttribute('data-product'));
    
    window.tracker("addTrans",
      (transaction.id).toString(),
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
        transaction.order_id.toString(),
        products[i].id.toString(),
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