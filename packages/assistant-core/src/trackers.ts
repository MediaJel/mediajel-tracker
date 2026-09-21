/**
 * The MediaJel tags actually running on a page, asked of Snowplow rather than read off its scripts.
 *
 * Every MediaJel tag — v1 on sp.js and v2 on cnna.js alike — loads Snowplow under the global
 * command function `tracker` and names each tracker after its app ID:
 * `tracker("newTracker", appId, collector, …)`. Snowplow runs a function passed as a command with
 * `this` set to the trackers it holds, keyed by those names, and it does so whether its SDK has
 * loaded yet or not: before, the function waits in the queue with the `newTracker` calls; after,
 * it runs at once. (Verified against both builds: `Object.keys(this)` is the app IDs either way.)
 *
 * That finds a tag however it arrived — pasted, injected by GTM, served through a proxy on any
 * host, held back by a page-speed plugin until the visitor moved — the moment it has run, and
 * before it has sent anything. It is the source that needs no deploy: the tag in production
 * today answers it.
 */

type SnowplowCommand = ((...args: unknown[]) => void) & { q?: { push?: unknown } };

/**
 * The loader's command function, recognised by its queue: an array before the SDK loads and the
 * SDK's queue object after. `GlobalSnowplowNamespace` cannot be the test — the SDK empties it once
 * it has loaded — and a page's own `tracker` global without a queue is left alone.
 */
export const snowplowCommand = (win: Window): SnowplowCommand | null => {
  const candidate = (win as unknown as { tracker?: SnowplowCommand }).tracker;
  return typeof candidate === "function" && typeof candidate.q?.push === "function" ? candidate : null;
};

/**
 * Asks the page's Snowplow which MediaJel trackers it holds, and calls back with their app IDs —
 * at once when the SDK has loaded, or when it loads. Never throws into the page. Returns whether
 * there was a Snowplow to ask.
 */
export const askRunningTags = (win: Window, onAnswer: (appIds: string[]) => void): boolean => {
  const command = snowplowCommand(win);
  if (!command) return false;
  try {
    command(function (this: Record<string, unknown> | undefined) {
      onAnswer(Object.keys(this ?? {}));
    });
    return true;
  } catch {
    /* the page's Snowplow is not ours to break; the other sources still answer */
    return false;
  }
};
