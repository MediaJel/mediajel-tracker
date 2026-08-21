import { guard } from "@mediajel/tracker-core/utils/guard";
import logger from "@mediajel/tracker-widget/log";
import styles from "@mediajel/tracker-widget/ui/styles";

/**
 * The widget's foothold on a page it does not own.
 *
 * Everything here exists because the host page is hostile by default — not maliciously, just
 * indifferently. It has its own stylesheet, its own z-index war, and a router that may replace
 * whole subtrees. The host answers each of those: an open shadow root so the page's CSS cannot
 * reach in and ours cannot leak out, `all: initial` inline so a `div { … }` rule in the page
 * cannot reach the host element either, the maximum z-index, and a watchdog that puts the host
 * back when something removes it.
 */

/** Id of the host element. The E2E specs and the Cypress harness look it up by this. */
export const WIDGET_HOST_ID = "mj-widget-host";

/**
 * Written as one declaration string so `all: initial` is guaranteed to come FIRST — it resets
 * every property, so anything declared before it is thrown away. Geometry beyond the corner
 * (and the bottom-sheet breakpoint) lives in the stylesheet's `:host` rule; these are only the
 * invariants that must hold even if the stylesheet never lands.
 */
const HOST_STYLE = [
  "all: initial",
  "position: fixed",
  "right: 16px",
  "bottom: 16px",
  "z-index: 2147483647",
  // The card is paper and never inverts; this stops a UA dark mode from repainting form
  // controls inside the shadow root.
  "color-scheme: light",
].join("; ");

export interface WidgetHost {
  /** The `<div id="mj-widget-host">` itself. */
  element: HTMLElement;
  root: ShadowRoot;
  /** Where preact renders. Kept separate from the root so the stylesheet is never re-parented. */
  mount: HTMLElement;
  /**
   * Whether an event or a node belongs to the widget rather than the page.
   *
   * The recorder asks this before capturing a click, a submit or a storage write, so the
   * operator driving the widget never shows up as evidence in their own recording. Accepts an
   * `Event` (uses `composedPath`, which is exact) or a node (walks out through shadow hosts,
   * which is what `event.target` gives you once retargeting has happened).
   */
  isOwn(target: EventTarget | Event | null | undefined): boolean;
  /** Remove the host and stop the watchdog. */
  destroy(): void;
}

const applyStyles = (root: ShadowRoot): void => {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(styles);
    root.adoptedStyleSheets = [sheet];
    return;
  } catch {
    // No constructable stylesheets (Safari < 16.4 and everything before 2021). A <style> in the
    // shadow root is scoped identically; it just cannot be shared between roots.
  }

  const style = document.createElement("style");
  style.textContent = styles;
  root.appendChild(style);
};

export const createHost = (doc: Document = document): WidgetHost => {
  // A previous chunk instance (or a hot reload) may have left one behind. One host, always.
  doc.getElementById(WIDGET_HOST_ID)?.remove();

  const element = doc.createElement("div");
  element.id = WIDGET_HOST_ID;
  element.setAttribute("style", HOST_STYLE);

  const root = element.attachShadow({ mode: "open" });
  applyStyles(root);

  const mount = doc.createElement("div");
  mount.className = "mj-root";
  root.appendChild(mount);

  doc.documentElement.appendChild(element);

  // SPAs that re-render from the top (or a `documentElement.innerHTML = …`) drop the host
  // silently. Watching childList on documentElement is enough — the host is a direct child.
  let observer: MutationObserver | null = null;
  if (typeof MutationObserver === "function") {
    observer = new MutationObserver(
      guard(() => {
        if (element.isConnected) return;
        // Removed because a newer instance took the id — that host is the live one now, and
        // putting this one back would leave two widgets fighting over the same corner.
        if (doc.getElementById(WIDGET_HOST_ID)) return;
        logger.debug("Host element was removed by the page; re-attaching.");
        doc.documentElement.appendChild(element);
      }, "host-watchdog"),
    );
    observer.observe(doc.documentElement, { childList: true });
  }

  const isOwn = (target: EventTarget | Event | null | undefined): boolean => {
    if (!target) return false;

    // An Event knows exactly which tree it crossed, shadow boundaries included.
    const path = (target as Event).composedPath;
    if (typeof path === "function") return path.call(target).includes(element);

    let node: Node | null = target as Node;
    while (node) {
      if (node === element) return true;
      const root_ = (node as Node & { getRootNode?: () => Node }).getRootNode?.();
      node = root_ instanceof ShadowRoot ? root_.host : node.parentNode;
    }
    return false;
  };

  return {
    element,
    root,
    mount,
    isOwn,
    destroy: () => {
      observer?.disconnect();
      observer = null;
      element.remove();
    },
  };
};
