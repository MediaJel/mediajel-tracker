export {};

declare global {
  interface Window {
    GlobalSnowplowNamespace: any;
    src: any;
    snowplow: any;
    tracker: any;
    trackerStaging: any;
    mj_liquidm_click_macros: any;
    Shopify: any;
    lightspeedTransaction: any;
    transactionOrder: any;
    transactionItems: any;
    transactionEmail: any;
    dataLayer: any;
    gtag: any;
    uetq: any;
    gtmDataLayer: any;
  }
}
