import { TransactionEvent, CartEvent, SignupParams } from "./snowplow/types";
import { QueryStringContext, RegisterThirdPartyTagsInput, retailIdentifier } from "./types";

export {};

/**
 * Snowplow command function injected synchronously by snowplow/*\/init.ts before any
 * consumer runs. Modeled as always-present so its ~60 call sites don't each need a guard;
 * the async-load race is handled at runtime by sources/utils/is-tracker-loaded.ts.
 * Snowplow commands have heterogeneous signatures, hence the (...args) shape.
 */
type SnowplowTrackerFn = (...args: any[]) => void;

declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string | null;
  }
  interface Window {
    // Legacy DNT signal (lib.dom omits it on Window); honored by the privacy opt-out gate.
    doNotTrack?: string | null;

    // --- Our own injected infra: present & usable (kept non-optional to contain churn) ---
    tracker: SnowplowTrackerFn;
    snowplow: SnowplowTrackerFn;
    GlobalSnowplowNamespace: string[];
    src: unknown;

    // --- Callbacks we assign onto window (already typed; unchanged) ---
    trackTrans: (input: TransactionEvent) => void;
    trackSignUp: (input: SignupParams) => void;
    addToCart: (input: CartEvent) => void;
    removeFromCart: (input: CartEvent) => void;
    registerThirdPartyTags: (input: RegisterThirdPartyTagsInput) => void;
    parseRetailId: (retail: retailIdentifier) => void;
    overrides: QueryStringContext;
    cnnaSegments?: unknown; // we only assign this (segments extension); never read it back

    // --- External / client / third-party globals: optional, so every access must be guarded ---
    Shopify?: { checkout?: any };
    dataLayer?: any[];
    gtmDataLayer?: any[];
    gtag?: (...args: any[]) => void;
    uetq?: any[];
    wixDevelopersAnalytics?: { register: (event: string, cb: (e: string, p: any) => void) => void };
    lightspeedTransaction?: any;
    transactionOrder?: unknown;
    transactionItems?: unknown;
    transactionEmail?: unknown;
    mj_liquidm_click_macros?: unknown;
    navigation?: { addEventListener: (type: string, cb: (e: Event) => void) => void };
    "$sl"?: { cartReview?: { form?: { name?: string } } };

    // --- Exposed only by the `exercise` environment (apps/integrations Exercises feature) ---
    // The real tracker-core data sources, surfaced as globals so learner code can wire capture itself.
    datalayerSource?: (callback: (data: any) => void, dataLayer?: any[]) => void;
    xhrRequestSource?: (callback: (xhrRequest: Document | XMLHttpRequestBodyInit) => void) => void;
    xhrResponseSource?: (callback: (xhrResponse: XMLHttpRequest) => void) => void;
    fetchSource?: (
      requestCallback: (input: RequestInfo | URL, init?: RequestInit) => void,
      responseCallback: (response: Response, responseBody: any) => void,
    ) => void;
    postMessageSource?: (callback: (event: MessageEvent<any>) => void) => void;
    formatXhrPayload?: (data: Document | XMLHttpRequestBodyInit) => unknown;
    mjApplyExtension?: (ext: (t: any) => any) => any;
  }
}
