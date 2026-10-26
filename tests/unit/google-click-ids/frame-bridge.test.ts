/**
 * Frame bridge (src/shared/google-click-ids/frame-bridge.ts): our tag inside an embedded menu (a cross-origin
 * iframe) asks the page around it for the click IDs. Fake window objects stand in for the browser's.
 */
import { describe, expect, test } from "bun:test";

import { ClickIdSet } from "../../../src/shared/google-click-ids/click-ids";
import { decodeBridgeMessage, startFrameBridge } from "../../../src/shared/google-click-ids/frame-bridge";

const G = "EAIaIQobChMItestGclid_1-2";
const SET: ClickIdSet = { ids: { gclid: G }, ts: 1800000000 };
const REQUEST = '{"mjcid":1,"t":"req","appId":"app-1"}';
const REPLY = `{"mjcid":1,"t":"ids","appId":"app-1","ids":{"gclid":"${G}"},"ts":1800000000}`;

describe("decodeBridgeMessage", () => {
  test("reads a request and a reply", () => {
    expect(decodeBridgeMessage(REQUEST)).toEqual({ t: "req", appId: "app-1" });
    expect(decodeBridgeMessage(REPLY)).toEqual({ t: "ids", appId: "app-1", set: SET });
  });

  test("keeps only known click-id names", () => {
    const withExtra = `{"mjcid":1,"t":"ids","appId":"a","ids":{"gclid":"${G}","evil":"x"},"ts":1800000000}`;
    expect(decodeBridgeMessage(withExtra)).toEqual({ t: "ids", appId: "a", set: SET });
  });

  test.each([
    ["an object (other scripts' messages)", { mjcid: 1, t: "req", appId: "a" }],
    ["null", null],
    ["someone else's JSON", '{"type":"dutchie"}'],
    ["a broken body after our prefix", '{"mjcid":1,garbage'],
    ["another protocol version", '{"mjcid":2,"t":"req","appId":"a"}'],
    ["an unknown type", '{"mjcid":1,"t":"zap","appId":"a"}'],
    ["a missing appId", '{"mjcid":1,"t":"req"}'],
    ["an invalid click id", '{"mjcid":1,"t":"ids","appId":"a","ids":{"gclid":"<x>"},"ts":1800000000}'],
    ["a missing click time", `{"mjcid":1,"t":"ids","appId":"a","ids":{"gclid":"${G}"}}`],
  ])("rejects %s", (_, data) => {
    expect(decodeBridgeMessage(data)).toBeNull();
  });
});

type Listener = (event: { data: unknown; source: unknown; origin: string }) => void;

const fakeWindow = (protocol = "https:") => {
  const listeners: Listener[] = [];
  const sent: [unknown, string][] = [];
  const win: any = {
    frames: { length: 0 },
    location: { protocol },
    addEventListener: (type: string, fn: Listener) => type === "message" && listeners.push(fn),
    postMessage: (data: unknown, origin: string) => sent.push([data, origin]),
  };
  win.parent = win;
  win.top = win;
  return { win, sent, deliver: (event: Parameters<Listener>[0]) => listeners.forEach((fn) => fn(event)) };
};

const addChild = (parent: any, child: any) => {
  parent.frames[parent.frames.length] = child;
  parent.frames.length += 1;
  child.parent = parent;
  child.top = parent.top;
};

// The page's allowlist: its own site plus the hosts the tag lists (crossDomainSites).
const ALLOWED = ["https://dutchie.com", "https://menu.example.org", "https://evil.example", "http://dutchie.com"];
const startParent = (win: any, current: () => ClickIdSet | null = () => SET) =>
  startFrameBridge({
    win,
    appId: "app-1",
    current,
    offer: () => undefined,
    schedule: () => undefined,
    allowedOrigin: (origin) => ALLOWED.indexOf(origin) !== -1,
  });

describe("page side (parent)", () => {
  test("answers a request from one of its frames, only to that frame's origin", () => {
    const page = fakeWindow();
    const menu = fakeWindow();
    addChild(page.win, menu.win);
    startParent(page.win);

    page.deliver({ data: REQUEST, source: menu.win, origin: "https://dutchie.com" });

    expect(menu.sent).toEqual([[REPLY, "https://dutchie.com"]]);
  });

  test("answers a frame nested inside one of its frames", () => {
    const page = fakeWindow();
    const outer = fakeWindow();
    const inner = fakeWindow();
    addChild(page.win, outer.win);
    addChild(outer.win, inner.win);
    startParent(page.win);

    page.deliver({ data: REQUEST, source: inner.win, origin: "https://menu.example.org" });

    expect(inner.sent).toHaveLength(1);
  });

  test("ignores windows that are not its frames, other tags, opaque origins and blocked consent", () => {
    const page = fakeWindow();
    const menu = fakeWindow();
    const stranger = fakeWindow();
    addChild(page.win, menu.win);
    let allowed = true;
    startParent(page.win, () => (allowed ? SET : null));

    page.deliver({ data: REQUEST, source: stranger.win, origin: "https://evil.example" });
    page.deliver({ data: REQUEST.replace("app-1", "app-2"), source: menu.win, origin: "https://dutchie.com" });
    page.deliver({ data: REQUEST, source: menu.win, origin: "null" });
    allowed = false;
    page.deliver({ data: REQUEST, source: menu.win, origin: "https://dutchie.com" });

    expect(stranger.sent).toEqual([]);
    expect(menu.sent).toEqual([]);
  });

  test("ignores one of its own frames whose origin is not on the allowlist (an ad or chat widget)", () => {
    const page = fakeWindow();
    const adFrame = fakeWindow();
    addChild(page.win, adFrame.win);
    startParent(page.win);

    page.deliver({ data: REQUEST, source: adFrame.win, origin: "https://ads.thirdparty.example" });

    expect(adFrame.sent).toEqual([]);
  });

  test("ignores plain-http requesters when the page itself is https", () => {
    const page = fakeWindow("https:");
    const menu = fakeWindow();
    addChild(page.win, menu.win);
    startParent(page.win);

    page.deliver({ data: REQUEST, source: menu.win, origin: "http://dutchie.com" });

    expect(menu.sent).toEqual([]);
  });
});

describe("frame side (child)", () => {
  const startChild = () => {
    const page = fakeWindow();
    const menu = fakeWindow();
    addChild(page.win, menu.win);
    const offered: ClickIdSet[] = [];
    const delays: number[] = [];
    startFrameBridge({
      win: menu.win,
      appId: "app-1",
      current: () => null,
      offer: (set) => offered.push(set),
      schedule: (fn, ms) => {
        delays.push(ms);
        if (ms === 0) fn();
      },
      allowedOrigin: () => false,
    });
    return { page, menu, offered, delays };
  };

  test("asks its parent right away and schedules retries", () => {
    const { page, delays } = startChild();
    expect(page.sent).toEqual([[REQUEST, "*"]]);
    expect(delays).toEqual([0, 1000, 3000, 7000]);
  });

  test("stores the ids only when the reply comes from its parent", () => {
    const { page, menu, offered } = startChild();
    menu.deliver({ data: REPLY, source: fakeWindow().win, origin: "https://evil.example" });
    menu.deliver({ data: REPLY, source: page.win, origin: "https://store.example.com" });
    expect(offered).toEqual([SET]);
  });
});
