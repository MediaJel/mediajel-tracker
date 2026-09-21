import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/assistant-core/recorder/recorder";
import { maskObject } from "@mediajel/assistant-core/session/masking";

/**
 * Watches every data-layer array on the page: `dataLayer`, `gtmDataLayer`, and anything else
 * window-global whose name ends in "datalayer". Existing entries are replayed (flagged, so
 * Review can tell "was already there" from "happened during your action" — the same replay
 * the frictionless google-datalayer-source does), then `push` is patched to call through
 * first and record second.
 *
 * GTM re-creates `window.dataLayer` wholesale on some sites, which orphans a patched array;
 * a 500ms identity poll re-patches the new one and replays only entries it has not seen.
 */

const CANDIDATES = ["dataLayer", "gtmDataLayer", "EcommDataLayer"];

interface Layer {
  name: string;
  array: unknown[];
  originalPush: (...items: unknown[]) => number;
  seen: number;
}

const summarize = (entry: unknown): string => {
  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const gtagArgs = record["0"] === "event" ? ` ${String(record["1"])}` : "";
    const named = typeof record.event === "string" ? ` ${record.event}` : gtagArgs;
    return `push${named} (${Object.keys(record).slice(0, 5).join(", ")})`;
  }
  return `push ${String(entry)}`;
};

export const dataLayerSource: Source = ({ emit }) => {
  const layers = new Map<string, Layer>();
  let disposed = false;

  const record = (name: string, entry: unknown, replayed: boolean): void => {
    emit(
      {
        kind: "datalayer",
        layer: name,
        data: maskObject(entry),
        ...(replayed ? { replayed: true } : {}),
        summary: `${name} ${summarize(entry)}${replayed ? " (before recording)" : ""}`,
      },
      { flush: !replayed, scoreText: JSON.stringify(entry ?? "").slice(0, 2_000) },
    );
  };

  const attach = (name: string, array: unknown[]): void => {
    const existing = layers.get(name);
    const alreadySeen = existing && existing.array === array ? existing.seen : 0;

    for (let i = alreadySeen; i < array.length; i += 1) record(name, array[i], true);

    const originalPush = array.push.bind(array);
    const layer: Layer = { name, array, originalPush, seen: array.length };
    array.push = ((...items: unknown[]): number => {
      const result = originalPush(...items);
      layer.seen = array.length;
      if (!disposed) for (const item of items) guard(() => record(name, item, false), "datalayer-record")();
      return result;
    }) as typeof array.push;

    layers.set(name, layer);
  };

  const discover = (): void => {
    const names = new Set(CANDIDATES);
    for (const key of Object.keys(window)) {
      if (/datalayer$/i.test(key)) names.add(key);
    }
    for (const name of names) {
      const value = (window as unknown as Record<string, unknown>)[name];
      if (!Array.isArray(value)) continue;
      const known = layers.get(name);
      if (known && known.array === value) continue; // same array, still patched
      attach(name, value);
    }
  };

  discover();
  const poll = setInterval(guard(discover, "datalayer-repatch"), 500);

  return () => {
    disposed = true;
    clearInterval(poll);
    for (const { array, originalPush } of layers.values()) {
      // Restore only if our patch is still the installed one — never clobber a later wrapper.
      if (array.push !== originalPush && String(array.push).includes("originalPush")) {
        array.push = originalPush;
      }
    }
    layers.clear();
  };
};
