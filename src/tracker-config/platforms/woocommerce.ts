import { EcommerceContext } from "../../interface";

export default function woocommerceTracker(context: EcommerceContext) {
  const { appId, retailId } = context;


  `<?php add_action( 'woocommerce_thankyou', function ($order_id) { ?>`

  const order = '<?php echo wc_get_order( $order_id );?>';
  const id = '<?php echo $order_id;?>';
  const total = '<?php echo wc_get_order( $order_id )->get_total();?>';
  const tax = '<?php echo wc_get_order( $order_id )->get_total_tax();?>';
  const shipping = '<?php echo wc_get_order( $order_id )->get_total_shipping();?>';
  const city = '<?php echo wc_get_order( $order_id )->get_billing_city();?>';
  const state = '<?php echo wc_get_order( $order_id )->get_billing_state();?>';
  const country = '<?php echo wc_get_order( $order_id )->get_billing_country();?>';
  const currency = '<?php echo wc_get_order( $order_id )->get_currency();?>';
  window.tracker(
    'addTrans',
    id,
    !retailId ? appId : retailId,
    total,
    tax,
    shipping,
    city,
    state,
    country,
    currency,
  );
  window.tracker('trackTrans');

  `<?php } );`
}