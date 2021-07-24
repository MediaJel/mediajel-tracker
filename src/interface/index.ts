declare global {
  interface Window {
    appId: any;
    GlobalSnowplowNamespace: any;
    snowplow: any;
  }
}

export interface ContextArg {
  appId?: string;
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
