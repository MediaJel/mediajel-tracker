import { describe, expect, test } from "bun:test";

import { cdnUrl } from "@mediajel/assistant-core/deploy/cdn";
import { commitMessage, deployTargets, targetPath } from "@mediajel/assistant-core/deploy/targets";

/**
 * What is left here after the commit moved server-side: the naming, which has to match what
 * the tag fetches byte for byte, and the message convention the repo's history is read by.
 * The GitHub call itself is tested in mediajel-serverless, where the credential now lives.
 */

describe("commitMessage", () => {
  test("matches the factory's byte-for-byte convention, create and update", () => {
    expect(
      commitMessage({
        update: false,
        kind: "domain",
        name: "www.example.com",
        actor: { name: "Jane", email: "jane@mediajel.com" },
      }),
    ).toBe("Add domain tag www.example.com\n\nCreated by: Jane (jane@mediajel.com)");
    expect(
      commitMessage({ update: true, kind: "app-id", name: "acme-1", actor: { name: "Jane", email: "j@m.com" } }),
    ).toBe("Update app-id tag acme-1\n\nUpdated by: Jane (j@m.com)");
  });
});

describe("deployTargets", () => {
  test("names the domain file after the live hostname and the app-id file after the app id", () => {
    const targets = deployTargets("shop.terpsstation.com", "acme-1");
    expect(targets.domain).toEqual({
      kind: "domain",
      name: "shop.terpsstation.com",
      path: "src/domains/shop.terpsstation.com.ts",
    });
    expect(targets.appId).toEqual({ kind: "app-id", name: "acme-1", path: "src/app-ids/acme-1.ts" });
  });

  test("offers no app-id target when the tag has no app id", () => {
    expect(deployTargets("www.example.com", "").appId).toBeNull();
  });

  test("targetPath is the one place either folder is spelled", () => {
    expect(targetPath("domain", "a.com")).toBe("src/domains/a.com.ts");
    expect(targetPath("app-id", "b")).toBe("src/app-ids/b.ts");
  });
});

describe("cdnUrl", () => {
  test("builds the exact base64-with-padding URL the tag fetches", () => {
    expect(cdnUrl("https://cdn.test", "domain", "www.example.com")).toBe(
      `https://cdn.test/domains/${btoa("www.example.com")}.js`,
    );
    expect(cdnUrl("https://cdn.test", "app-id", "acme-1")).toBe(`https://cdn.test/app-ids/${btoa("acme-1")}.js`);
  });

  test("returns null without a CDN base rather than building a broken URL", () => {
    expect(cdnUrl("", "domain", "www.example.com")).toBeNull();
  });
});
