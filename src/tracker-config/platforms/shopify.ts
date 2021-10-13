import { EcommerceContext } from "../../interface";

export default function shopifyTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

    window.tracker("addTrans",
      "{{ order.order_number }}",
      !retailId ? appId : retailId,
      parseInt("{{ order.total_price }}"),
      parseInt("{{ order.tax_price }}" ? "{{ order.tax_price }}" : "0"),
      parseInt("{{ order.shipping_price }}" ? "{{ order.shipping_price }}" : "0"),
      "{{ customer_address.city }}" ? "{{ customer_address.city }}" : "N/A",
      "{{ customer_address.province }}" ? "{{ customer_address.province }}" : "N/A",
      "{{ customer_address.country }}" ? "{{ customer_address.country}}" : "N/A",
      "{{ currency.iso_code }}"
    )
    
    window.tracker("addItem",
      "{{ order.order_number }}",
      "{{ product.variants }}",
      "{{ product.title }}",
      "{{ product.first_available_variant }}",
      parseInt("{{ product.price_min }}"),
      parseInt("{{ product.available }}" ? "{{ product.available }}" : "1"),
      "{{ currency.iso_code }}"
    );

    window.tracker('trackTrans');
}