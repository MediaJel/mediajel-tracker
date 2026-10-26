/**
 * Where a persisted click lives. Reads every place a click ID can already be on this site (our cookie and
 * localStorage, Google's click cookies and _gcl_ls record, the frictionless pilot's key) and keeps the newest valid
 * one. Writes only our own cookie/localStorage, plus Google's _gcl_aw/_gcl_gb when they are missing (seedGoogle).
 * Every storage access is guarded: blocked cookies or storage read as empty and never throw.
 */
import { CLICK_WINDOW_SECONDS, ClickIdName, ClickIds, ClickIdSet, pickLatest } from "./click-ids";
import {
  decodeOwnValue,
  decodePilotStorage,
  encodeOwnValue,
  formatGclCookie,
  parseGclAgCookie,
  parseGclCookie,
  parseGclLocalStorage,
} from "./codec";
import { buildCookie, readCookie } from "./cookies";

const OWN_KEY = "_mj_gcl";
const PILOT_KEY = "mediajel_google_click_ids";
const GOOGLE_RECORD_KEY = "_gcl_ls";
// The click cookies gtag reads at conversion time; only these two formats were verified against live gtag.js.
const SEEDABLE: { name: ClickIdName; cookie: string }[] = [
  { name: "gclid", cookie: "_gcl_aw" },
  { name: "wbraid", cookie: "_gcl_gb" },
];

export interface StoreEnv {
  getCookies: () => string;
  setCookie: (cookie: string) => void;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  cookieDomain: string | null;
  secure: boolean;
  framed: boolean;
  nowSec: () => number;
}

export interface ClickIdStore {
  load: () => ClickIdSet | null;
  save: (set: ClickIdSet) => void;
  clear: () => void;
  /** Writes Google's click cookies that are missing; returns the names written. */
  seedGoogle: (set: ClickIdSet) => string[];
}

const single = (name: ClickIdName, parsed: { id: string; ts: number } | null): ClickIdSet | null => {
  if (!parsed) return null;
  const ids: ClickIds = {};
  ids[name] = parsed.id;
  return { ids, ts: parsed.ts };
};

export const createClickIdStore = (env: StoreEnv): ClickIdStore => {
  const guard = (fn: () => void): boolean => {
    try {
      fn();
      return true;
    } catch {
      return false;
    }
  };
  const getItem = (key: string): string | null => {
    let value: string | null = null;
    guard(() => {
      value = env.storage ? env.storage.getItem(key) : null;
    });
    return value;
  };
  const cookieText = (): string => {
    let text = "";
    guard(() => {
      text = env.getCookies();
    });
    return text;
  };
  const options = (set: ClickIdSet | null) => ({
    domain: env.cookieDomain,
    maxAge: set ? set.ts + CLICK_WINDOW_SECONDS - env.nowSec() : 0,
    secure: env.secure,
    framed: env.framed,
  });

  const load = (): ClickIdSet | null => {
    const jar = cookieText();
    return pickLatest(
      [
        decodeOwnValue(readCookie(jar, OWN_KEY)),
        decodeOwnValue(getItem(OWN_KEY)),
        decodePilotStorage(getItem(PILOT_KEY)),
        single("gclid", parseGclCookie(readCookie(jar, "_gcl_aw"))),
        single("wbraid", parseGclCookie(readCookie(jar, "_gcl_gb"))),
        single("gbraid", parseGclAgCookie(readCookie(jar, "_gcl_ag"))),
        single("gclid", parseGclLocalStorage(getItem(GOOGLE_RECORD_KEY))),
      ],
      env.nowSec(),
    );
  };

  const save = (set: ClickIdSet): void => {
    const value = encodeOwnValue(set);
    if (readCookie(cookieText(), OWN_KEY) !== value) guard(() => env.setCookie(buildCookie(OWN_KEY, value, options(set))));
    guard(() => env.storage && env.storage.setItem(OWN_KEY, value));
  };

  const clear = (): void => {
    guard(() => env.setCookie(buildCookie(OWN_KEY, "", options(null))));
    guard(() => env.storage && env.storage.removeItem(OWN_KEY));
  };

  const seedGoogle = (set: ClickIdSet): string[] => {
    const jar = cookieText();
    return SEEDABLE.filter(({ name, cookie }) => {
      const id = set.ids[name];
      if (!id || readCookie(jar, cookie) !== null) return false;
      return guard(() => env.setCookie(buildCookie(cookie, formatGclCookie(set.ts, id), options(set))));
    }).map(({ cookie }) => cookie);
  };

  return { load, save, clear, seedGoogle };
};
