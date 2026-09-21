/**
 * The panels open on this worker's tabs, by the tab each is bound to.
 *
 * One thing turns on the count alone: while any panel is open, other vendors' trackers are heard
 * too (`listenAbroad` in `wire.ts`), and the moment the last panel closes they are not. The
 * registry says when the count crosses zero either way, and keeps the ports so a message can reach
 * the right panel.
 */

export interface Panels {
  /** A panel bound itself to a tab; a panel already bound there is replaced. */
  bind(tabId: number, port: chrome.runtime.Port): void;
  /** The port closed — forgotten, unless a newer one has taken its place. */
  unbind(tabId: number, port: chrome.runtime.Port): void;
  /** Whether a panel is watching the tab. */
  watching(tabId: number): boolean;
  /** Delivers a message to the tab's panel, if one is bound; a port that fails is forgotten. */
  send(tabId: number, message: unknown): void;
}

export const panelRegistry = (onFirst: () => void, onLast: () => void): Panels => {
  const ports = new Map<number, chrome.runtime.Port>();

  /** Makes a change to the ports and says when it opened the first panel or closed the last. */
  const crossing = (change: () => void): void => {
    const wasOpen = ports.size > 0;
    change();
    const isOpen = ports.size > 0;
    if (isOpen !== wasOpen) (isOpen ? onFirst : onLast)();
  };

  return {
    bind: (tabId, port) => crossing(() => void ports.set(tabId, port)),
    unbind: (tabId, port) =>
      crossing(() => {
        if (ports.get(tabId) === port) ports.delete(tabId);
      }),
    watching: (tabId) => ports.has(tabId),
    send: (tabId, message) => {
      try {
        ports.get(tabId)?.postMessage(message);
      } catch {
        crossing(() => void ports.delete(tabId));
      }
    },
  };
};
