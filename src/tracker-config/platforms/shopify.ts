import { EcommerceContext } from "../../interface";

export default function shopifyTracker(context: EcommerceContext) {
  const { appId, retailId } = context;
  const transaction = window.Shopify.checkout;
  const products = transaction.line_items;

  window.tracker("addTrans",
    transaction.order_id.toString(),
    !retailId ? appId : retailId,
    parseFloat(transaction.total_price),
    parseFloat(transaction.total_tax ? transaction.total_tax : 0),
    parseFloat(transaction.shipping_rate.price ? transaction.shipping_rate.price : 0),
    (transaction.billing_address.city ?  transaction.billing_address.city : "N/A").toString(),
    (transaction.billing_address.province ? transaction.billing_address.province : "N/A").toString(),
    (transaction.billing_address.country ?  transaction.billing_address.country : "N/A").toString(),
    transaction.currency.toString()
  )
  
  for(let i = 0; i < products.length; ++i) {
    window.tracker("addItem",
      transaction.order_id.toString(),
      products[i].id.toString(),
      (products[i].title ? products[i].title : "N/A").toString(),
      (products[i].variant_title ? products[i].variant_title : "N/A").toString(),
      parseFloat(products[i].price),
      parseFloat(products[i].quantity ? products[i].quantity : 1),
      transaction.currency.toString()
    );
  }

  window.tracker('trackTrans');
}