import { CartEvent, QueryStringContext, TransactionEvent } from "src/shared/types";

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
}

export interface SnowplowTrackerEcommerceEvents {
  trackTransaction: (input: TransactionEvent) => void;
  trackAddToCart: (input: CartEvent) => void;
  trackRemoveFromCart: (input: CartEvent) => void;
}

export interface CreateSnowplowTrackerInput {
  appId: string;
  retailId?: string;
  collector: string;
  event: string;
  version: string;
}
