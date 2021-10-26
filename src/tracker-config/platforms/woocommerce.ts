import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;
  const transaction = JSON.parse(document.currentScript.getAttribute('data-order'));
  
  if(!transaction) return;
  else {
    console.log(transaction);
    window.tracker(
      'addTrans',
      (transaction.cart_hash).toString(),
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
}