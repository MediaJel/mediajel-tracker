import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mock } from "bun:test";

import { setLoggingEnabled } from "@mediajel/tracker-core/logger";

/**
 * A DOM and a `chrome` for the modules under test.
 *
 * The asset mock has to be registered before anything imports the icons: a scheme-prefixed
 * specifier (`data-base64:…`) never reaches a `Bun.plugin` hook, so `mock.module` is the only
 * mechanism that can stand in for it.
 */

mock.module("data-base64:~/ui/assets/mj-mark-128.png", () => ({ default: "data:image/png;base64,AA==" }));

GlobalRegistrator.register({ url: "https://shop.example.com/checkout" });

// A refused transition is a thing the machine is supposed to do; it is not test output.
setLoggingEnabled(false);

/**
 * Just enough of the extension API for the code under test. Deliberately not a framework: each
 * test that needs a behaviour installs it, so a test can never pass because a shared fake was
 * generous.
 */
const area = (): {
  store: Map<string, unknown>;
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
} => {
  const store = new Map<string, unknown>();
  return {
    store,
    get: async (keys) => {
      if (keys === undefined || keys === null) return Object.fromEntries(store);
      const wanted = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(wanted.filter((key) => store.has(key)).map((key) => [key, store.get(key)]));
    },
    set: async (items) => {
      for (const [key, value] of Object.entries(items)) store.set(key, value);
    },
    remove: async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) store.delete(key);
    },
  };
};

const local = area();

(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local,
    sync: area(),
    session: area(),
    onChanged: { addListener: () => undefined, removeListener: () => undefined },
  },
  runtime: {
    id: "mj-test-extension",
    connect: () => ({
      postMessage: () => undefined,
      disconnect: () => undefined,
      onMessage: { addListener: () => undefined },
      onDisconnect: { addListener: () => undefined },
    }),
    sendMessage: async () => ({ ok: true, value: null }),
    onMessage: { addListener: () => undefined },
    onConnect: { addListener: () => undefined },
    lastError: undefined,
  },
  tabs: {
    query: async () => [{ id: 1, url: "https://shop.example.com/checkout", windowId: 1 }],
    get: async () => ({ id: 1, url: "https://shop.example.com/checkout", windowId: 1 }),
    update: async () => undefined,
    onActivated: { addListener: () => undefined, removeListener: () => undefined },
  },
  scripting: { registerContentScripts: async () => undefined },
  sidePanel: { setPanelBehavior: async () => undefined, open: async () => undefined },
};

/** Lets a test start from a known store rather than from whatever ran before it. */
export const clearExtensionStorage = (): void => local.store.clear();
