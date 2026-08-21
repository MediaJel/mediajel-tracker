import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/tracker-widget/recorder/recorder";
import { WIDGET_ACTIVE_KEY, WIDGET_SESSION_KEY, WIDGET_SETTINGS_KEY } from "@mediajel/tracker-widget/session/keys";
import { maskValue } from "@mediajel/tracker-widget/session/masking";

/**
 * Sites park order state in storage between checkout pages (the frictionless repo's
 * `mdj_order_summary` hand-off pattern exists because of it).
 *
 * Patched per INSTANCE, not on `Storage.prototype`: own-property wrappers on
 * `window.localStorage` and `window.sessionStorage` survive environments that vend cached or
 * proxy-wrapped methods (test DOMs, privacy shims) where a prototype patch is silently
 * bypassed — and each wrapper knows its area without identity games. Call-through-first;
 * our own keys, Snowplow's, and the tag's dedup keys are noise and skipped.
 */
export const storageSource: Source = ({ widget, emit }) => {
  let disposed = false;

  const skip = (key: string): boolean =>
    key === WIDGET_ACTIVE_KEY ||
    key === WIDGET_SESSION_KEY ||
    key === WIDGET_SETTINGS_KEY ||
    key.startsWith("_sp_") ||
    key.startsWith("sp_") ||
    key.startsWith("snowplow") ||
    (widget.tag.appId ? key.startsWith(`${widget.tag.appId}_`) : false);

  const patchArea = (area: "local" | "session"): (() => void) => {
    let storage: Storage;
    try {
      storage = area === "local" ? window.localStorage : window.sessionStorage;
      storage.getItem(WIDGET_ACTIVE_KEY); // probe: a blocked storage throws here, not later
    } catch {
      return () => undefined; // sandboxed iframe / blocked storage — nothing to watch
    }

    const originalSet = storage.setItem.bind(storage);
    const originalRemove = storage.removeItem.bind(storage);
    const ownSetBefore = Object.getOwnPropertyDescriptor(storage, "setItem");
    const ownRemoveBefore = Object.getOwnPropertyDescriptor(storage, "removeItem");

    Object.defineProperty(storage, "setItem", {
      configurable: true,
      writable: true,
      value: (key: string, value: string): void => {
        originalSet(key, value);
        if (disposed || skip(key)) return;
        guard(
          () =>
            emit(
              {
                kind: "storage",
                area,
                op: "set",
                key,
                value: maskValue(key, String(value)).slice(0, 512),
                summary: `${area}Storage.set ${key}`,
              },
              { scoreText: `${key} ${String(value).slice(0, 500)}` },
            ),
          "storage-record",
        )();
      },
    });

    Object.defineProperty(storage, "removeItem", {
      configurable: true,
      writable: true,
      value: (key: string): void => {
        originalRemove(key);
        if (disposed || skip(key)) return;
        guard(
          () =>
            emit({ kind: "storage", area, op: "remove", key, value: null, summary: `${area}Storage.remove ${key}` }),
          "storage-record",
        )();
      },
    });

    return () => {
      const restore = (name: "setItem" | "removeItem", before: PropertyDescriptor | undefined): void => {
        try {
          if (before) Object.defineProperty(storage, name, before);
          else delete (storage as unknown as Record<string, unknown>)[name];
        } catch {
          /* a storage that refuses restore keeps the (now inert) wrapper */
        }
      };
      restore("setItem", ownSetBefore);
      restore("removeItem", ownRemoveBefore);
    };
  };

  const disposers = [patchArea("local"), patchArea("session")];

  return () => {
    disposed = true;
    for (const dispose of disposers) dispose();
  };
};
