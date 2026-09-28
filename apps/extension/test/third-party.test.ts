import { afterEach, describe, expect, test } from "bun:test";

import { Outcome, ThirdPartyTrigger } from "@mediajel/assistant-core/wire/types";

import { ThirdPartyFired } from "~/bridge/protocol";
import { ThirdPartyReport, watchThirdPartyTags } from "~/bridge/third-party";

/**
 * The third-party tags a page registers with the tag, and each one the tag fires, seen from beside
 * the tag in a happy-dom page: the accessor on `window.registerThirdPartyTags`, the wrapper the
 * page calls, the observer on the body, and the property given back when the bridge stands down.
 */

const PROPERTY = "registerThirdPartyTags";
const win = window as Window & typeof globalThis;

/** The page's `registerThirdPartyTags`, however it got there. */
const register = (): ((input: unknown) => unknown) =>
  (win as unknown as Record<string, (input: unknown) => unknown>)[PROPERTY];

/** What the tag's function would see: every call, and the answer it gives. */
const tagFunction = (calls: unknown[]) =>
  function registerThirdPartyTags(this: unknown, input: unknown): string {
    calls.push(input);
    return "registered";
  };

interface Seen {
  registered: [string, ThirdPartyTrigger[]][];
  fired: [string, ThirdPartyFired][];
  settled: [string, Outcome][];
}

const reporter = (): { seen: Seen; report: ThirdPartyReport } => {
  const seen: Seen = { registered: [], fired: [], settled: [] };
  return {
    seen,
    report: {
      registered: (key, triggers) => void seen.registered.push([key, triggers]),
      fired: (key, fire) => void seen.fired.push([key, fire]),
      settled: (key, outcome) => void seen.settled.push([key, outcome]),
    },
  };
};

/** MutationObserver callbacks are delivered on a later tick. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const REGISTRATION = {
  onTransaction: [
    { type: "image", tag: "https://pixel.example/conv?order={transaction_id}&total={transaction_total}" },
    { type: "script", tag: "https://js.partner.example/t.js?o={transaction_id}" },
  ],
  onSignup: [{ type: "image", tag: "https://pixel.example/signup?email={signup_email}&phone={signup_phone}" }],
  onAddToCart: "not a list",
};

/** An element appended to the body with its `src` already set, the way the tag appends one. */
const appended = (tag: "img" | "script", src: string): HTMLElement => {
  const element = document.createElement(tag);
  element.setAttribute("src", src);
  document.body.appendChild(element);
  return element;
};

let stop: (() => void) | null = null;

afterEach(() => {
  stop?.();
  stop = null;
  delete (win as unknown as Record<string, unknown>)[PROPERTY];
  document.body.innerHTML = "";
});

describe("the accessor on window.registerThirdPartyTags", () => {
  test("installed before the tag assigns: nothing is there, then the tag's assignment goes through the setter", () => {
    const { seen, report } = reporter();
    stop = watchThirdPartyTags(win, report);
    expect(register()).toBeUndefined();

    const calls: unknown[] = [];
    const theirs = tagFunction(calls);
    (win as unknown as Record<string, unknown>)[PROPERTY] = theirs;
    expect(typeof register()).toBe("function");
    expect(register()).not.toBe(theirs);

    // A page call is forwarded — same argument, same answer — and recorded without its templates.
    expect(register()(REGISTRATION)).toBe("registered");
    expect(calls).toEqual([REGISTRATION]);
    expect(seen.registered).toHaveLength(1);
    expect(seen.registered[0][1]).toEqual([
      { trigger: "onTransaction", count: 2, hosts: ["pixel.example", "js.partner.example"] },
      { trigger: "onSignup", count: 1, hosts: ["pixel.example"] },
    ]);
    expect(JSON.stringify(seen)).not.toContain("{transaction_id}");
  });

  test("installed over a live tab: the function already there is wrapped the same way", () => {
    const calls: unknown[] = [];
    (win as unknown as Record<string, unknown>)[PROPERTY] = tagFunction(calls);
    const { seen, report } = reporter();
    stop = watchThirdPartyTags(win, report);
    register()({ onSignup: REGISTRATION.onSignup });
    expect(calls).toHaveLength(1);
    expect(seen.registered.map(([, triggers]) => triggers)).toEqual([
      [{ trigger: "onSignup", count: 1, hosts: ["pixel.example"] }],
    ]);
  });

  test("a property the page made non-configurable is left alone, and only the capture is lost", () => {
    const calls: unknown[] = [];
    const theirs = tagFunction(calls);
    // A window of the page's own with the property locked down, standing on the real one.
    const locked = Object.create(win) as Window & typeof globalThis;
    Object.defineProperty(locked, PROPERTY, { value: theirs, configurable: false, writable: true });
    const { seen, report } = reporter();
    const stopLocked = watchThirdPartyTags(locked, report);
    expect((locked as unknown as Record<string, unknown>)[PROPERTY]).toBe(theirs);
    stopLocked();
    expect(seen.registered).toEqual([]);
  });

  test("stopped, the property is plain again and holds the tag's function; nothing more is watched", async () => {
    const calls: unknown[] = [];
    const theirs = tagFunction(calls);
    const { seen, report } = reporter();
    const stopWatching = watchThirdPartyTags(win, report);
    (win as unknown as Record<string, unknown>)[PROPERTY] = theirs;
    register()(REGISTRATION);
    stopWatching();

    const descriptor = Object.getOwnPropertyDescriptor(win, PROPERTY)!;
    expect(descriptor.value).toBe(theirs);
    expect(descriptor.writable).toBe(true);
    expect(descriptor.get).toBeUndefined();
    register()(REGISTRATION);
    appended("img", "https://pixel.example/conv?order=T1&total=1");
    await tick();
    expect(seen.registered).toHaveLength(1);
    expect(seen.fired).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  test("stopped before the tag ever assigned, the property is gone", () => {
    const stopWatching = watchThirdPartyTags(win, reporter().report);
    stopWatching();
    expect(Object.getOwnPropertyDescriptor(win, PROPERTY)).toBeUndefined();
  });
});

describe("the fires", () => {
  const registered = (): Seen => {
    const { seen, report } = reporter();
    stop = watchThirdPartyTags(win, report);
    (win as unknown as Record<string, unknown>)[PROPERTY] = tagFunction([]);
    register()(REGISTRATION);
    return seen;
  };

  test("an appended image whose src matches a registered template is a fire with its trigger, masked; load settles it", async () => {
    const seen = registered();
    const img = appended("img", "https://pixel.example/signup?email=jane.doe@example.com&phone=555-123-4567");
    await tick();
    expect(seen.fired).toHaveLength(1);
    const [key, fire] = seen.fired[0];
    expect(fire).toEqual({
      trigger: "onSignup",
      element: "image",
      host: "pixel.example",
      url: "https://pixel.example/signup?email=j***@e***.com&phone=***-4567",
    });
    expect(key).not.toBe(seen.registered[0][0]);

    img.dispatchEvent(new Event("load"));
    expect(seen.settled).toEqual([[key, { kind: "ok", status: 0, fromCache: false }]]);
  });

  test("a transaction pixel is matched with its macros filled; an error settles it as not loaded", async () => {
    const seen = registered();
    const img = appended("img", "https://pixel.example/conv?order=T4821&total=84");
    await tick();
    expect(seen.fired.map(([, fire]) => [fire.trigger, fire.element, fire.url])).toEqual([
      ["onTransaction", "image", "https://pixel.example/conv?order=T4821&total=84"],
    ]);
    img.dispatchEvent(new Event("error"));
    expect(seen.settled.map(([, outcome]) => outcome)).toEqual([{ kind: "failed", status: 0 }]);
  });

  test("a script template matches a script, not an image with the same URL", async () => {
    const seen = registered();
    appended("img", "https://js.partner.example/t.js?o=T4821");
    appended("script", "https://js.partner.example/t.js?o=T4821");
    await tick();
    expect(seen.fired.map(([, fire]) => [fire.trigger, fire.element, fire.host])).toEqual([
      ["onTransaction", "script", "js.partner.example"],
    ]);
  });

  test("an image or a script the page appends for its own reasons is ignored", async () => {
    const seen = registered();
    appended("img", "https://pixel.example/other?order=T4821");
    appended("img", "https://cdn.example/hero.jpg");
    appended("script", "https://cdn.example/app.js");
    const div = document.createElement("div");
    div.innerHTML = '<img src="https://pixel.example/conv?order=T4821&total=84">';
    document.body.appendChild(div);
    await tick();
    expect(seen.fired).toEqual([]);
  });

  test("nothing registered, nothing fires", async () => {
    const { seen, report } = reporter();
    stop = watchThirdPartyTags(win, report);
    appended("img", "https://pixel.example/conv?order=T4821&total=84");
    await tick();
    expect(seen.fired).toEqual([]);
  });
});
