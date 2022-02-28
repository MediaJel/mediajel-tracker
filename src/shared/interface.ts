// TODO: Remove import and properly declare global scope for interface Window
import { QueryStringParams } from "../shared/types";

declare global {
  interface Window {
    GlobalSnowplowNamespace: any;
    src: any;
    snowplow: any;
    tracker: any;
    Shopify: any;
    lightspeedTransaction: any;
    transactionOrder: any;
    transactionItems: any;
    dataLayer: any;
  }
}
