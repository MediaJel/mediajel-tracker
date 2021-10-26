import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;
  const scripts = document.getElementsByTagName('script');
  const lastScript = scripts[scripts.length-1];
  const scriptName = lastScript;
  const transaction = JSON.parse(scriptName.getAttribute('data-order'));
  console.log(transaction);
  
  if(!transaction) return;
  else {
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