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

export interface TagContext {
  appId?: string;
  mediajelAppId?: string;
  environment?: string;
  retailId?: string;
  test?: boolean | undefined;
}

export interface ContextInterface {
  appId: string;
  environment: string;
  collector: string;
  retailId: string;
}
