export default function Shopify(aid) {
  const mediajelAppId = aid;
  // Note: Tracks only Transactions

  window.mediajelAppId(
    "addTrans",
    "{{order.id}}",
    `${mediajelAppId}`,
    "{{order.total_price}}",
    "0",
    "0",
    "N/A",
    "California",
    "USA"
  );

  window.mediajelAppId("trackTrans");
}
