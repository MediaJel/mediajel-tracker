/**
 * Decorates a link at the moment it is activated (like Google's own linker), so hrefs are never rewritten on page
 * load and only links a visitor actually follows change. Listeners are capture-phase and passive; a failure here is
 * swallowed so it can never break the site's click handling.
 */
import { ClickIds } from "./click-ids";
import { decorateHref, PageScope } from "./decorate";

// contextmenu included: "Open link in new tab" from the context menu should carry the click too.
const ACTIVATION_EVENTS = ["mousedown", "touchstart", "auxclick", "click", "contextmenu"];

type Link = HTMLAnchorElement | HTMLAreaElement;

const isLink = (node: unknown): node is Link => {
  const element = node as Element;
  return (
    !!element &&
    typeof element.tagName === "string" &&
    /^(a|area)$/i.test(element.tagName) &&
    typeof (element as Link).href === "string" &&
    typeof element.hasAttribute === "function" &&
    element.hasAttribute("href")
  );
};

const findLink = (event: Event): Link | null => {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
  for (let i = 0; i < path.length; i++) {
    if (isLink(path[i])) return path[i] as Link;
  }
  return null;
};

// The link this activation follows, unless it is a download or inside an opted-out element.
const linkToDecorate = (event: Event): Link | null => {
  const link = findLink(event);
  if (!link || link.hasAttribute("download") || link.closest("[data-mj-no-decorate]")) return null;
  return link;
};

const decorateLink = (link: Link, ids: ClickIds | null, scope: PageScope): void => {
  const raw = link.getAttribute("href");
  if (raw === null || !ids) return;
  const decorated = decorateHref(raw, link.href, ids, scope);
  if (decorated && decorated !== raw) link.setAttribute("href", decorated);
};

export const installLinkDecoration = (doc: Document, getIds: () => ClickIds | null, scope: PageScope): void => {
  const decorate = (event: Event) => {
    try {
      const link = linkToDecorate(event);
      // Read the page URL at click time: an SPA may have changed routes since the listener was installed.
      if (link) decorateLink(link, getIds(), { ...scope, pageUrl: doc.location ? doc.location.href : undefined });
    } catch {
      // never let decoration interfere with the visitor's click
    }
  };
  ACTIVATION_EVENTS.forEach((type) => doc.addEventListener(type, decorate, { capture: true, passive: true }));
};
