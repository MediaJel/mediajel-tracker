import {
    CartEvent, ImpressionsMacrosParams, QueryStringContext, SignupParams, TransactionEvent
} from 'src/shared/types';

export interface SnowplowTrackerInitializeInput {
  appId: string;
  collector: string;
  event: string;
}
export interface SnowplowTracker {
  initialize: (input: SnowplowTrackerInitializeInput) => void;
  /** Mainly used for book-keeping purposes so we can document params & the tag itself */
  record: (input: QueryStringContext) => void;
  ecommerce: SnowplowTrackerEcommerceEvents;
  impressions?: SnowplowTrackerImpressionEvents;
  /** Used for tracking a signup when rendering the tag, acts like an image tag */
  trackSignup: (input: Partial<SignupParams>) => void;
  /** Properties of the integration tracker url */
  context: QueryStringContext;
}

export interface SnowplowTrackerEcommerceEvents {
  trackTransaction: (input: TransactionEvent) => void;
  trackAddToCart: (input: CartEvent) => void;
  trackRemoveFromCart: (input: CartEvent) => void;
}

export interface SnowplowTrackerImpressionEvents {
  trackLiquidmImpression: (input: Partial<ImpressionsMacrosParams>) => void;
  trackMantisImpression: (input: Partial<ImpressionsMacrosParams>) => void;
  trackSimplifiImpression: (input: Partial<ImpressionsMacrosParams>) => void;
}

export interface CreateSnowplowTrackerInput extends QueryStringContext {}
export { TransactionEvent, SignupParams };

