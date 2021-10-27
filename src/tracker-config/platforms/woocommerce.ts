import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  if(window.location.pathname.includes("/checkout/order-received/") && window.location.search) {
    const scripts = document.getElementById('universal');
    const transaction = JSON.parse(scripts.getAttribute('data-order'));
    
    window.tracker(
      'addTrans',
      (transaction.id).toString(),
      !retailId ? appId : retailId,
      parseFloat(transaction.total),
      parseFloat(transaction.total_tax),
      parseFloat(transaction.shipping_total),
      (transaction.billing.city).toString(),
      (transaction.billing.state).toString(),
      (transaction.billing.country).toString(),
      (transaction.currency).toString(),
    );
    window.tracker('trackTrans');
  }
  else {
    return;
  }
}