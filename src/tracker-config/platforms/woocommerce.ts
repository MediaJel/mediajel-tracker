import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;
  
  if(!window.order) return;
  else {
    const transaction = JSON.parse(window.order);

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