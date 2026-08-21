import { afterEach, describe, expect, test } from "bun:test";

import { WIDGET_HOST_ID, WidgetHost, createHost } from "@mediajel/tracker-widget/ui/host";

let host: WidgetHost | null = null;

const mount = (): WidgetHost => {
  host = createHost();
  return host;
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  host?.destroy();
  host = null;
  document.documentElement.querySelectorAll(`#${WIDGET_HOST_ID}`).forEach((node) => node.remove());
});

describe("mounting", () => {
  test("attaches to documentElement, not body — an SPA that swaps <body> must not take it", () => {
    const element = mount().element;

    expect(element.id).toBe(WIDGET_HOST_ID);
    expect(element.parentElement).toBe(document.documentElement);
  });

  test("carries the containment invariants inline, where no page stylesheet can reach them", () => {
    const style = mount().element.getAttribute("style") ?? "";

    expect(style).toContain("all: initial");
    expect(style).toContain("position: fixed");
    expect(style).toContain("z-index: 2147483647");
    // `all: initial` has to come first or it wipes everything declared before it.
    expect(style.indexOf("all: initial")).toBeLessThan(style.indexOf("position: fixed"));
  });

  test("opens a shadow root with a mount point inside it", () => {
    const created = mount();

    expect(created.root.mode).toBe("open");
    expect(created.mount.parentNode).toBe(created.root);
    expect(created.element.shadowRoot).toBe(created.root);
  });

  test("replaces a host left behind by an earlier instance instead of stacking a second one", () => {
    const stale = document.createElement("div");
    stale.id = WIDGET_HOST_ID;
    document.documentElement.appendChild(stale);

    const created = mount();

    expect(document.querySelectorAll(`#${WIDGET_HOST_ID}`)).toHaveLength(1);
    expect(document.getElementById(WIDGET_HOST_ID)).toBe(created.element);
  });
});

describe("styles", () => {
  test("adopts a constructed stylesheet when the browser supports one", () => {
    const created = mount();

    expect(created.root.adoptedStyleSheets).toHaveLength(1);
    expect(created.root.querySelector("style")).toBeNull();
  });

  test("falls back to a <style> element when constructed stylesheets are unavailable", () => {
    const real = globalThis.CSSStyleSheet;
    // Safari before 16.4 and every pre-2021 engine: the class exists but cannot be constructed.
    (globalThis as Record<string, unknown>).CSSStyleSheet = function Broken() {
      throw new TypeError("Illegal constructor");
    };

    try {
      const created = mount();
      const style = created.root.querySelector("style");

      expect(style).not.toBeNull();
      expect(style?.textContent).toContain("--mj-identity");
      expect(created.root.adoptedStyleSheets).toHaveLength(0);
    } finally {
      (globalThis as Record<string, unknown>).CSSStyleSheet = real;
    }
  });
});

describe("watchdog", () => {
  test("re-attaches the host when the page tears it out", async () => {
    const created = mount();

    created.element.remove();
    expect(created.element.isConnected).toBe(false);

    await settle();

    expect(created.element.isConnected).toBe(true);
    expect(document.querySelectorAll(`#${WIDGET_HOST_ID}`)).toHaveLength(1);
  });

  test("stops watching after destroy(), so the host stays gone", async () => {
    const created = mount();
    created.destroy();
    host = null;

    await settle();

    expect(created.element.isConnected).toBe(false);
    expect(document.getElementById(WIDGET_HOST_ID)).toBeNull();
  });
});

describe("isOwn", () => {
  test("recognises the host, a node in the shadow tree, and anything deeper", () => {
    const created = mount();
    const inner = document.createElement("button");
    created.mount.appendChild(inner);

    expect(created.isOwn(created.element)).toBe(true);
    expect(created.isOwn(created.mount)).toBe(true);
    expect(created.isOwn(inner)).toBe(true);
  });

  test("does not claim the page's own nodes", () => {
    const created = mount();
    const pageButton = document.createElement("button");
    document.body.appendChild(pageButton);

    try {
      expect(created.isOwn(pageButton)).toBe(false);
      expect(created.isOwn(document.body)).toBe(false);
      expect(created.isOwn(null)).toBe(false);
    } finally {
      pageButton.remove();
    }
  });

  test("recognises an event that crossed out of the shadow root", () => {
    const created = mount();
    const inner = document.createElement("button");
    created.mount.appendChild(inner);

    const seen: boolean[] = [];
    const listener = (event: Event) => seen.push(created.isOwn(event));
    document.addEventListener("click", listener);

    try {
      inner.dispatchEvent(new Event("click", { bubbles: true, composed: true }));
      document.body.dispatchEvent(new Event("click", { bubbles: true, composed: true }));
    } finally {
      document.removeEventListener("click", listener);
    }

    // The recorder needs this to ignore the operator driving the widget while it records the
    // operator driving the page.
    expect(seen).toEqual([true, false]);
  });
});
