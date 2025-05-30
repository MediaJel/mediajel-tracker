import { CartEvent, SignupParams, TransactionEventVariation } from "./snowplow/types";
import { RegisterThirdPartyTagsInput } from './types';

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
    trackTrans: (input: TransactionEventVariation) => void;
    trackSignUp: (input: SignupParams) => void;
    addToCart: (input: CartEvent) => void;
    removeFromCart: (input: CartEvent) => void;
    gtmDataLayer: any;
    registerThirdPartyTags: (input: RegisterThirdPartyTagsInput) => void;
  }
}
