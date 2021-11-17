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
