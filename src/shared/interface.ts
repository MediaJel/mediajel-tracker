import { QueryStringParams } from "../get-tag/helpers/types";

declare global {
  interface Window {
    appId: any;
    GlobalSnowplowNamespace: any;
    snowplow: any;
    tracker: any;
    Shopify: any;
    transactionOrder: any;
    transactionItems: any;
  }
}
