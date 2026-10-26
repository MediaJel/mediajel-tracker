/**
 * Click-time decoration wiring (src/shared/google-click-ids/link-listener.ts): which link activations rewrite the
 * href. Fake elements and events stand in for the DOM; listeners are captured from addEventListener.
 */
import { describe, expect, test } from "bun:test";

import { installLinkDecoration } from "../../../src/shared/google-click-ids/link-listener";

const G = "EAIaIQobChMItestGclid_1-2";
const scope = { hostname: "shop.example.com", cookieDomain: "example.com" };

const fakeLink = (href: string, attrs: Record<string, string> = {}, optedOut = false) => {
  const attributes: Record<string, string> = { href, ...attrs };
  return {
    tagName: "A",
    get href() {
      return attributes.href.trim();
    },
    getAttribute: (name: string) => (name in attributes ? attributes[name] : null),
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
    hasAttribute: (name: string) => name in attributes,
    closest: (selector: string) => (optedOut && selector === "[data-mj-no-decorate]" ? {} : null),
  };
};

const install = (getIds: () => any = () => ({ gclid: G })) => {
  const listeners: Record<string, (event: any) => void> = {};
  const doc: any = { addEventListener: (type: string, fn: any) => (listeners[type] = fn) };
  installLinkDecoration(doc, getIds, scope);
  return (type: string, link: any, extra: Record<string, unknown> = {}) =>
    listeners[type]({ type, target: link, composedPath: () => [link, {}], button: 0, ...extra });
};

describe("installLinkDecoration", () => {
  test.each(["mousedown", "touchstart", "auxclick", "click"])("%s on an outbound link adds the click ID", (type) => {
    const fire = install();
    const link = fakeLink("https://dutchie.com/stores/x");
    fire(type, link);
    expect(link.getAttribute("href")).toBe(`https://dutchie.com/stores/x?gclid=${G}`);
  });

  test("a right-button mousedown (context menu, copy link) leaves the link alone", () => {
    const fire = install();
    const link = fakeLink("https://dutchie.com/x");
    fire("mousedown", link, { button: 2 });
    expect(link.getAttribute("href")).toBe("https://dutchie.com/x");
  });

  test("download links and links inside [data-mj-no-decorate] are skipped", () => {
    const fire = install();
    const download = fakeLink("https://cdn.example.org/menu.pdf", { download: "" });
    const optedOut = fakeLink("https://dutchie.com/x", {}, true);
    fire("click", download);
    fire("click", optedOut);
    expect(download.getAttribute("href")).toBe("https://cdn.example.org/menu.pdf");
    expect(optedOut.getAttribute("href")).toBe("https://dutchie.com/x");
  });

  test("a click with no persisted click leaves the link alone", () => {
    const fire = install(() => null);
    const link = fakeLink("https://dutchie.com/x");
    fire("click", link);
    expect(link.getAttribute("href")).toBe("https://dutchie.com/x");
  });

  test("a failure while reading click IDs never escapes into the site's click handling", () => {
    const fire = install(() => {
      throw new Error("storage blocked");
    });
    const link = fakeLink("https://dutchie.com/x");
    expect(() => fire("click", link)).not.toThrow();
    expect(link.getAttribute("href")).toBe("https://dutchie.com/x");
  });

  test("with carryInUrl, same-site links carry the click to the next route; links within this page do not", () => {
    const here = "https://shop.example.com/menu?x=1";
    const listeners: Record<string, (event: any) => void> = {};
    const doc: any = { location: { href: here }, addEventListener: (type: string, fn: any) => (listeners[type] = fn) };
    installLinkDecoration(doc, () => ({ gclid: G }), { ...scope, carryInUrl: true });
    const resolvedLink = (raw: string) => {
      const link = fakeLink(raw);
      Object.defineProperty(link, "href", { get: () => new URL(link.getAttribute("href") as string, here).href });
      return link;
    };
    const nextRoute = resolvedLink("/deals");
    const section = resolvedLink("https://shop.example.com/menu?x=1#reviews");
    listeners.click({ type: "click", target: nextRoute, composedPath: () => [nextRoute] });
    listeners.click({ type: "click", target: section, composedPath: () => [section] });
    expect(nextRoute.getAttribute("href")).toBe(`/deals?gclid=${G}`);
    expect(section.getAttribute("href")).toBe("https://shop.example.com/menu?x=1#reviews");
  });

  test("finds the link when the click lands on an element inside it", () => {
    const fire = install();
    const link = fakeLink("https://dutchie.com/x");
    const icon = { tagName: "SPAN" };
    fire("click", icon, { composedPath: () => [icon, link, {}] });
    expect(link.getAttribute("href")).toBe(`https://dutchie.com/x?gclid=${G}`);
  });
});
