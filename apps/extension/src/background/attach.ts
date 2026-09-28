/**
 * Attaching to tabs that were open before this build of the extension was.
 *
 * Chrome runs an extension's content scripts in documents loaded after the extension is; a tab
 * open before an install, an update or a reload has none, and the copies an earlier build left
 * behind can no longer talk to it. Until now that tab had to be reloaded. Instead, the relay and
 * the page bridge are injected into every open http(s) tab whenever this build starts for the
 * first time — the same files Chrome would have run, from the manifest and from the registration
 * Plasmo makes at worker start — and each copy claims its place so nothing runs twice.
 */

/** Plasmo registers the bridge from the worker's own startup; on a cold start it can still be in flight. */
const REGISTRATION_POLL_MS = 100;
const REGISTRATION_TRIES = 10;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** A script path as `executeScript` wants it: relative to the extension's root, never a full URL. */
const relativePath = (file: string): string =>
  file.startsWith("chrome-extension://") ? new URL(file).pathname.slice(1) : file;

const registeredMainWorld = async (): Promise<string[]> => {
  for (let attempt = 0; attempt < REGISTRATION_TRIES; attempt += 1) {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const files = registered.filter((script) => script.world === "MAIN").flatMap((script) => script.js ?? []);
    if (files.length > 0) return files.map(relativePath);
    await sleep(REGISTRATION_POLL_MS);
  }
  return [];
};

/** The files a page needs: the relay from the manifest, the bridge from the worker's registration. */
export const bridgeFiles = async (): Promise<{ relay: string[]; bridge: string[] }> => ({
  relay: (chrome.runtime.getManifest().content_scripts ?? []).flatMap((script) => script.js ?? []).map(relativePath),
  bridge: await registeredMainWorld(),
});

/** Gives one tab a relay and a bridge. False when it cannot have them: chrome://, the Web Store, a tab that closed. */
export const attach = async (tabId: number): Promise<boolean> => {
  try {
    const { relay, bridge } = await bridgeFiles();
    if (relay.length === 0 || bridge.length === 0) return false;
    // The relay first, so the bridge's `ready` has a listener to reach.
    await chrome.scripting.executeScript({ target: { tabId }, files: relay });
    await chrome.scripting.executeScript({ target: { tabId }, files: bridge, world: "MAIN" });
    return true;
  } catch {
    return false;
  }
};

/** Every open http(s) tab, each on its own: one that refuses does not stop the others. */
export const attachAll = async (): Promise<void> => {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.all(
    tabs.filter((tab) => tab.id !== undefined && !tab.discarded).map((tab) => attach(tab.id as number)),
  );
};
