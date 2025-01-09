import { TransactionEvent } from "./snowplow/types";

export {};

declare global {
  interface Window {
    cnnaSegments: any;
    wixDevelopersAnalytics: any;
    GlobalSnowplowNamespace: any;
    src: any;
    snowplow: any;
    tracker: any;
    mj_liquidm_click_macros: any;
    Shopify: any;
    lightspeedTransaction: any;
    transactionOrder: any;
    transactionItems: any;
    transactionEmail: any;
    dataLayer: any;
    gtag: any;
    uetq: any;
    trackTrans: (input: TransactionEvent) => void;
    gtmDataLayer: any;
    registerThirdPartyTags: () => void;
  }
}
