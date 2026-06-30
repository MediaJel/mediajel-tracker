import logger from "@mediajel/tracker-core/logger";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow/types";
import { applyExtensions } from "@mediajel/tracker-core/snowplow/extensions";
import { datalayerSource } from "@mediajel/tracker-core/sources/google-datalayer-source";
import { xhrRequestSource, formatXhrPayload } from "@mediajel/tracker-core/sources/xhr-request-source";
import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { fetchSource } from "@mediajel/tracker-core/sources/fetch-source";
import { postMessageSource } from "@mediajel/tracker-core/sources/post-message-source";

/**
 * The `exercise` environment powers the "Exercises" feature of the Integrations
 * training site (apps/integrations). It is the capstone counterpart to `training`:
 * where `training` AUTO-captures (dataLayer/fetch/postMessage -> observable.notify),
 * `exercise` captures NOTHING. It only EXPOSES the real tracker-core data-source
 * primitives as window globals so the learner's own code can subscribe to the
 * simulated app's effects and emit the Snowplow events by hand. Success is graded
 * entirely from Snowplow Micro, never from client-side state.
 *
 * Because it never calls `observable.notify(...)`, the ecommerce adapter's existing
 * `observable.subscribe(...)` stays inert — there is no hidden path that completes an
 * exercise for the learner.
 *
 * description: "exercise powers the apps/integrations Exercises feature (learner-written capture)"
 * events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "add_to_cart", "label": "Add to Cart" }, { "value": "remove_from_cart", "label": "Remove from Cart" }, { "value": "sign_up", "label": "Sign Up" }]
 */
const ExerciseDataSource = (snowplow?: SnowplowTracker): void => {
  const w = window as unknown as Record<string, unknown>;

  // Expose the EXACT same source modules the real tracker uses (real implementations,
  // not reimplementations) so the learner wires capture with the same primitives the Course teaches.
  w.datalayerSource = datalayerSource;
  w.xhrRequestSource = xhrRequestSource;
  w.xhrResponseSource = xhrResponseSource;
  w.fetchSource = fetchSource;
  w.postMessageSource = postMessageSource;
  w.formatXhrPayload = formatXhrPayload;

  // Keep the "build an extension" capability available, identical to `training`, so an
  // exercise can also rehearse the extension lesson if desired.
  if (snowplow) {
    w.mjApplyExtension = (ext: (t: SnowplowTracker) => SnowplowTracker): SnowplowTracker => {
      const extended = applyExtensions(snowplow, [ext]);
      window.trackTrans = extended.ecommerce?.trackTransaction ?? window.trackTrans;
      window.trackSignUp = extended.trackSignup ?? window.trackSignUp;
      window.addToCart = extended.ecommerce?.trackAddToCart ?? window.addToCart;
      window.removeFromCart = extended.ecommerce?.trackRemoveFromCart ?? window.removeFromCart;
      return extended;
    };
  }

  logger.debug("[exercise] data sources exposed on window (no auto-capture)");
};

export default ExerciseDataSource;
