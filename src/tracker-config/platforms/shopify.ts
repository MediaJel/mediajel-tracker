import { EcommerceContext } from "../../interface";

export default function shopifyTracker(context: EcommerceContext) {
  const order = document.currentScript.getAttribute('data-order');
  const product = document.currentScript.getAttribute('data-product');
  const customer_address = document.currentScript.getAttribute('data-customer_address');
  const currency = document.currentScript.getAttribute('data-currency');

  const { appId, retailId } = context;

  window.tracker("addTrans",
    order.order_number.toString(),
    !retailId ? appId : retailId,
    parseInt(order.total_price),
    parseInt(order.tax_price ? order.tax_price : 0),
    parseInt(order.shipping_price ? order.shipping_price : 0),
    (customer_address.city ?  customer_address.city : "N/A").toString(),
    (customer_address.province ? customer_address.province : "N/A").toString(),
    (customer_address.country ?  customer_address.country : "N/A").toString(),
    currency.iso_code.toString()
  )
  
  window.tracker("addItem",
    order.order_number.toString(),
    product.variants.toString(),
    product.title.toString(),
    product.first_available_variant.toString(),
    parseInt(product.price_min),
    parseInt(product.available ? product.available : 1),
    currency.iso_code.toString()
  );

  window.tracker('trackTrans');
}