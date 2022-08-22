export {};

declare global {
  interface Window {
    GlobalSnowplowNamespace: any;
    src: any;
    snowplow: any;
    tracker: any;
    mj_liquidm_click_macros: any;
    Shopify: any;
    lightspeedTransaction: any;
    transactionOrder: any;
    transactionItems: any;
    dataLayer: any;
    email: any;
  }
}
