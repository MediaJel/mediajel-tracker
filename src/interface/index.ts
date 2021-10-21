import { ErrorName } from "./enum";
declare global {
  interface Window {
    appId: any;
    GlobalSnowplowNamespace: any;
    snowplow: any;
    tracker: any;
    Shopify: any;
  }

  type order = any;
  type product = any;
  type customer_address = any;
  type currency = any;
}

export interface ContextArg {
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

export interface ErrorContext {
  name: ErrorName | string;
  cause?: string;
}

export interface DynamicContext {
  appId: string;
  environment: string;
  retailId: string;
}

export interface EcommerceContext {
  appId: string;
  retailId: string;
}

export interface PageviewContext {
  appId: string;
  collector: string;
  retailId: string;
}
