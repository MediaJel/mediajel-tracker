import { EcommerceContext } from "../../interface";

export default function shopifyTracker(context: EcommerceContext) {
  const { appId, retailId } = context;
  const transaction = window.Shopify.checkout;
  const products = transaction.line_items;
  // window.Shopify.checkout.order.total_price * 100;
  console.log("STARTS HERE " + transaction);
  console.log(products);

  window.tracker("addTrans",
    transaction.order_id.toString(),
    !retailId ? appId : retailId,
    parseInt(transaction.total_price),
    parseInt(transaction.total_tax ? transaction.total_tax : 0),
    parseInt(transaction.shipping_rate.price ? transaction.shipping_rate.price : 0),
    (transaction.billing_address.city ?  transaction.billing_address.city : "N/A").toString(),
    (transaction.billing_address.province ? transaction.billing_address.province : "N/A").toString(),
    (transaction.billing_address.country ?  transaction.billing_address.country : "N/A").toString(),
    transaction.currency.toString()
  )

  console.log("DIS THE MIDDLE " + transaction.order_id);
  console.log(transaction.total_price);
  console.log(transaction.total_tax);
  console.log(transaction.shipping_rate.price);
  console.log(transaction.billing_address.city);
  console.log(transaction.billing_address.province);
  console.log(transaction.billing_address.country);
  console.log(transaction.currency);
  
  for(let i = 0; i < products.length; ++i) {
    window.tracker("addItem",
      transaction.order_id.toString(),
      products[i].id.toString(),
      (products[i].title ? products[i].title : "N/A").toString(),
      (products[i].variant_title ? products[i].variant_title : "N/A").toString(),
      parseInt(products[i].price),
      parseInt(products[i].quantity ? products[i].quantity : 1),
      transaction.currency.toString()
    );
  }
  
  console.log("ENDS HERE " + products[0].price);

  window.tracker('trackTrans');
}