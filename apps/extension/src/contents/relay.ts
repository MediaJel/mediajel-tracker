import type { PlasmoCSConfig } from "plasmo";

import { BridgeDown, BridgeUp, WIRE_VERSION, unwrap, wrap } from "~/bridge/protocol";
import { claimRelay } from "~/bridge/claim";
import { RELAY_PORT } from "~/lib/ports";

/**
 * The hop the main-world bridge cannot make.
 *
 * This runs in the isolated world, where `chrome.*` exists but the page's globals do not — the
 * exact mirror image of `page-bridge.ts`. It carries recorded events up to the background over
 * a long-lived port and commands back down over `postMessage`, and it does nothing else: no
 * decisions, no storage, no interpretation of what passes through.
 *
 * The port is what makes recording survive a navigation. When the page goes away the port
 * disconnects, the background knows the tab has moved, and the next document opens a new one —
 * while the session it has been writing into is somewhere neither document can lose.
 */

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_start",
  all_frames: false,
};

let port: chrome.runtime.Port | null = null;

const connect = (): chrome.runtime.Port | null => {
  try {
    const opened = chrome.runtime.connect({ name: RELAY_PORT });
    opened.onMessage.addListener((message: BridgeDown) => {
      window.postMessage(wrap("down", message), "*");
    });
    opened.onDisconnect.addListener(() => {
      port = null;
    });
    return opened;
  } catch {
    // The service worker was asleep and the connect raced its wake-up, or the extension was
    // reloaded under us. Either way the next message reconnects; nothing is lost, because the
    // page-bridge is still recording and the background re-asks for a snapshot on connect.
    return null;
  }
};

const ensure = (): chrome.runtime.Port | null => (port ??= connect());

const forward = (event: MessageEvent): void => {
  const message = unwrap<BridgeUp>(event, "up");
  if (!message) return;
  try {
    ensure()?.postMessage(message);
  } catch {
    port = null;
  }
};

// The way down when the port is closed. Chrome stops an idle worker and the port goes with it, and
// this relay only reopens one when the page next says something — so the background sends commands
// as one-off messages too, which only this extension's background can send to this tab.
const fromBackground = (message: BridgeDown): void => {
  window.postMessage(wrap("down", message), "*");
};

// A relay injected over a live one — the extension attaching to a tab it was installed over —
// takes the old one's place; two would forward every event twice.
claimRelay(WIRE_VERSION, () => {
  window.removeEventListener("message", forward);
  chrome.runtime.onMessage.removeListener(fromBackground);
  port?.disconnect();
  port = null;
});

window.addEventListener("message", forward);
chrome.runtime.onMessage.addListener(fromBackground);
ensure();
