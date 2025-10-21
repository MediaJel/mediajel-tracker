import { TransactionEvent, CartEvent, SignupParams } from "./snowplow/types";
import { QueryStringContext, RegisterThirdPartyTagsInput, retailIdentifier } from "./types";

export {};

declare global {
  interface Window {
    cnnaSegments: any;
    wixDevelopersAnalytics: any;
    GlobalSnowplowNamespace: any;
    navigation: any;
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
    trackSignUp: (input: SignupParams) => void;
    addToCart: (input: CartEvent) => void;
    removeFromCart: (input: CartEvent) => void;
    gtmDataLayer: any;
    registerThirdPartyTags: (input: RegisterThirdPartyTagsInput) => void;
    overrides?: {
      [key: string]: any;
      default?: any;
    };
    parseRetailId: (retail: retailIdentifier) => void;
  }
}
