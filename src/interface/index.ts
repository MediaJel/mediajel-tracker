import { ErrorName } from "./enum";


export type ContextArg = Partial<ContextInterface> & { mediajelAppId?: string, test?: boolean | undefined }
declare global {
  interface Window {
    appId: any;
    GlobalSnowplowNamespace: any;
    snowplow: any;
    tracker: any;
  }
}



export interface ContextInterface {
  appId: string;
  environment: string;
  collector: string;
  retailId: string;
  client: string
}

export interface ErrorContext {
  name: ErrorName | string;
  cause?: string;
}

export interface TagContext {
  appId: string;
  environment: string;
  retailId: string;
  client: string
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
