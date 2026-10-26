/**
 * Click-ID store (src/shared/google-click-ids/store.ts): where a persisted click is read from and written to.
 * A small fake cookie jar stands in for document.cookie; it records every cookie string the store writes.
 */
import { describe, expect, test } from "bun:test";

import { createClickIdStore, StoreEnv } from "../../../src/shared/google-click-ids/store";

const NOW = 1_800_000_000;
const DAY = 86_400;
const G = "EAIaIQobChMItestGclid_1-2";
const G2 = "EAIaIQobChMInewerClick_99";
const WB = "CjkKTestWbraid34AbCd";
const GB = "0AAAAAoTestGbraid12AbCd";

const fakeEnv = (cookies: Record<string, string> = {}, local: Record<string, string> = {}, overrides = {}) => {
  const jar = { ...cookies };
  const written: string[] = [];
  const store: Record<string, string> = { ...local };
  const env: StoreEnv = {
    getCookies: () => Object.keys(jar).map((name) => `${name}=${jar[name]}`).join("; "),
    setCookie: (text) => {
      written.push(text);
      const [pair] = text.split("; ");
      const name = pair.slice(0, pair.indexOf("="));
      if (/Max-Age=0(;|$)/.test(text)) delete jar[name];
      else jar[name] = pair.slice(name.length + 1);
    },
    storage: {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
    },
    cookieDomain: "example.com",
    secure: true,
    framed: false,
    nowSec: () => NOW,
    ...overrides,
  };
  return { env, jar, written, local: store };
};

describe("load", () => {
  test("reads our own cookie", () => {
    const { env } = fakeEnv({ _mj_gcl: `1.${NOW - DAY}.${G}..` });
    expect(createClickIdStore(env).load()).toEqual({ ids: { gclid: G }, ts: NOW - DAY });
  });

  test("a newer, different click in Google's _gcl_aw wins", () => {
    const { env } = fakeEnv({ _mj_gcl: `1.${NOW - 10 * DAY}.${G}..`, _gcl_aw: `GCL.${NOW - DAY}.${G2}` });
    expect(createClickIdStore(env).load()).toEqual({ ids: { gclid: G2 }, ts: NOW - DAY });
  });

  test("the same click rewritten by Google keeps our original click time", () => {
    const { env } = fakeEnv({ _mj_gcl: `1.${NOW - 10 * DAY}.${G}..`, _gcl_aw: `GCL.${NOW - DAY}.${G}` });
    expect(createClickIdStore(env).load()).toEqual({ ids: { gclid: G }, ts: NOW - 10 * DAY });
  });

  test("reads wbraid from _gcl_gb and gbraid from _gcl_ag", () => {
    expect(createClickIdStore(fakeEnv({ _gcl_gb: `GCL.${NOW - DAY}.${WB}` }).env).load()).toEqual({
      ids: { wbraid: WB },
      ts: NOW - DAY,
    });
    expect(createClickIdStore(fakeEnv({ _gcl_ag: `2.1.k${GB}$i${NOW - DAY}` }).env).load()).toEqual({
      ids: { gbraid: GB },
      ts: NOW - DAY,
    });
  });

  test("falls back to localStorage: ours, then the pilot's record", () => {
    const own = fakeEnv({}, { _mj_gcl: `1.${NOW - DAY}.${G}..` });
    expect(createClickIdStore(own.env).load()).toEqual({ ids: { gclid: G }, ts: NOW - DAY });
    const pilot = fakeEnv({}, {
      mediajel_google_click_ids: JSON.stringify({ ids: { gclid: G }, expires: (NOW - DAY + 90 * DAY) * 1000 }),
    });
    expect(createClickIdStore(pilot.env).load()).toEqual({ ids: { gclid: G }, ts: NOW - DAY });
  });

  test("our expired record keeps a gtag-refreshed _gcl_aw of the same click from reviving it", () => {
    const { env } = fakeEnv({ _gcl_aw: `GCL.${NOW - DAY}.${G}` }, { _mj_gcl: `1.${NOW - 91 * DAY}.${G}..` });
    expect(createClickIdStore(env).load()).toBeNull();
  });

  test("an expired click is not returned", () => {
    const { env } = fakeEnv({ _mj_gcl: `1.${NOW - 91 * DAY}.${G}..` });
    expect(createClickIdStore(env).load()).toBeNull();
  });

  test("blocked storage reads as empty instead of throwing", () => {
    const { env } = fakeEnv({}, {}, {
      storage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
      },
    });
    expect(createClickIdStore(env).load()).toBeNull();
  });
});

describe("save and clear", () => {
  test("save writes our cookie for the rest of the 90-day window, and mirrors it to localStorage", () => {
    const { env, written, local } = fakeEnv();
    createClickIdStore(env).save({ ids: { gclid: G }, ts: NOW - DAY });
    expect(written).toEqual([`_mj_gcl=1.${NOW - DAY}.${G}..; Max-Age=${89 * DAY}; Path=/; Domain=example.com; SameSite=Lax; Secure`]);
    expect(local._mj_gcl).toBe(`1.${NOW - DAY}.${G}..`);
  });

  test("save skips the cookie write when the same value is already stored", () => {
    const { env, written } = fakeEnv({ _mj_gcl: `1.${NOW - DAY}.${G}..` });
    createClickIdStore(env).save({ ids: { gclid: G }, ts: NOW - DAY });
    expect(written).toEqual([]);
  });

  test("clear expires our cookie and removes our storage key", () => {
    const { env, jar, local } = fakeEnv({ _mj_gcl: `1.${NOW - DAY}.${G}..` }, { _mj_gcl: `1.${NOW - DAY}.${G}..` });
    createClickIdStore(env).clear();
    expect(jar._mj_gcl).toBeUndefined();
    expect(local._mj_gcl).toBeUndefined();
  });
});

describe("seedGoogle", () => {
  test("writes _gcl_aw for a gclid when Google has none, with the original click time", () => {
    const { env, written } = fakeEnv();
    const names = createClickIdStore(env).seedGoogle({ ids: { gclid: G }, ts: NOW - DAY });
    expect(names).toEqual(["_gcl_aw"]);
    expect(written).toEqual([`_gcl_aw=GCL.${NOW - DAY}.${G}; Max-Age=${89 * DAY}; Path=/; Domain=example.com; SameSite=Lax; Secure`]);
  });

  test("writes _gcl_gb for a wbraid, never a cookie for gbraid", () => {
    const { env } = fakeEnv();
    expect(createClickIdStore(env).seedGoogle({ ids: { wbraid: WB, gbraid: GB }, ts: NOW - DAY })).toEqual(["_gcl_gb"]);
  });

  test("never overwrites a click cookie Google already holds", () => {
    const { env, written } = fakeEnv({ _gcl_aw: `GCL.${NOW - 2 * DAY}.${G2}` });
    expect(createClickIdStore(env).seedGoogle({ ids: { gclid: G }, ts: NOW - DAY })).toEqual([]);
    expect(written).toEqual([]);
  });
});
