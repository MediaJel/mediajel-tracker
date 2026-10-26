/**
 * Cookie-domain discovery (root-domain.ts) and cookie strings (cookies.ts).
 */
import { describe, expect, test } from "bun:test";

import { buildCookie, readCookie } from "../../../src/shared/google-click-ids/cookies";
import { candidateDomains, discoverCookieDomain } from "../../../src/shared/google-click-ids/root-domain";

describe("candidateDomains", () => {
  test("lists parent domains from the shortest up, never a bare TLD", () => {
    expect(candidateDomains("shop.example.com")).toEqual(["example.com", "shop.example.com"]);
    expect(candidateDomains("a.b.example.co.uk")).toEqual([
      "co.uk",
      "example.co.uk",
      "b.example.co.uk",
      "a.b.example.co.uk",
    ]);
  });

  test("single-label hosts and IP addresses get host-only cookies", () => {
    expect(candidateDomains("localhost")).toEqual([]);
    expect(candidateDomains("127.0.0.1")).toEqual([]);
    expect(candidateDomains("[::1]")).toEqual([]);
  });
});

describe("discoverCookieDomain", () => {
  test("returns the shortest domain the browser accepts a cookie on", () => {
    const tried: string[] = [];
    const accepts = (domain: string) => {
      tried.push(domain);
      return domain !== "co.uk";
    };
    expect(discoverCookieDomain("a.b.example.co.uk", accepts)).toBe("example.co.uk");
    expect(tried).toEqual(["co.uk", "example.co.uk"]);
  });

  test("falls back to a host-only cookie", () => {
    expect(discoverCookieDomain("shop.example.com", () => false)).toBeNull();
    expect(discoverCookieDomain("localhost", () => true)).toBeNull();
  });
});

describe("cookies", () => {
  test("readCookie finds one cookie in document.cookie text", () => {
    const jar = "a=1; _mj_gcl=1.1800000000.EAIaIQobChMI..; b=x=y";
    expect(readCookie(jar, "_mj_gcl")).toBe("1.1800000000.EAIaIQobChMI..");
    expect(readCookie(jar, "b")).toBe("x=y");
    expect(readCookie(jar, "missing")).toBeNull();
    expect(readCookie("", "a")).toBeNull();
  });

  test("buildCookie writes a first-party Lax cookie on the shared domain", () => {
    expect(buildCookie("_mj_gcl", "v", { domain: "example.com", maxAge: 100, secure: true, framed: false })).toBe(
      "_mj_gcl=v; Max-Age=100; Path=/; Domain=example.com; SameSite=Lax; Secure",
    );
  });

  test("buildCookie omits Domain for host-only cookies and Secure on http", () => {
    expect(buildCookie("_mj_gcl", "v", { domain: null, maxAge: 5, secure: false, framed: false })).toBe(
      "_mj_gcl=v; Max-Age=5; Path=/; SameSite=Lax",
    );
  });

  test("inside a cross-site frame on https the cookie is partitioned", () => {
    expect(buildCookie("_mj_gcl", "v", { domain: null, maxAge: 5, secure: true, framed: true })).toBe(
      "_mj_gcl=v; Max-Age=5; Path=/; SameSite=None; Secure; Partitioned",
    );
  });
});
