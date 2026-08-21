/* global RequestInfo, RequestInit */
import { describe, expect, test } from "bun:test";

import { TEMPLATE_XHR } from "@mediajel/tracker-widget/ai/knowledge";
import { cdnUrl } from "@mediajel/tracker-widget/deploy/cdn";
import { commitMessage, deployTag } from "@mediajel/tracker-widget/deploy/deploy";
import { BOT_IDENTITY, createGitHubClient, utf8ToBase64 } from "@mediajel/tracker-widget/deploy/github";
import { WidgetRuntime } from "@mediajel/tracker-widget/runtime";

type Handler = (input: { url: string; method: string; body: unknown }) => { status: number; json: unknown };

const fakeRuntime = (
  handler: Handler,
): { runtime: WidgetRuntime; calls: { url: string; method: string; body: unknown }[] } => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const pristineFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = {
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const { status, json } = handler(call);
    return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return {
    runtime: {
      pristineFetch,
      pristineXhrOpen: XMLHttpRequest.prototype.open,
      pristineXhrSend: XMLHttpRequest.prototype.send,
    },
    calls,
  };
};

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

describe("utf8ToBase64", () => {
  test("round-trips non-ASCII content", () => {
    const source = 'const note = "总计 — café";\n';
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(utf8ToBase64(source)), (c) => c.charCodeAt(0)));
    expect(decoded).toBe(source);
  });
});

describe("createGitHubClient", () => {
  test("getFile returns null on 404 and decoded content on 200", async () => {
    const { runtime } = fakeRuntime(({ url }) =>
      url.includes("missing")
        ? { status: 404, json: { message: "Not Found" } }
        : { status: 200, json: { sha: "abc123", content: utf8ToBase64("existing tag\n") } },
    );
    const client = createGitHubClient("tok", runtime);
    expect(await client.getFile("src/domains/missing.ts")).toBeNull();
    const file = await client.getFile("src/domains/there.ts");
    expect(file?.sha).toBe("abc123");
    expect(file?.content).toBe("existing tag\n");
  });

  test("putFile sends the factory identity, master branch and base64 content", async () => {
    const { runtime, calls } = fakeRuntime(() => ({
      status: 201,
      json: {
        commit: { html_url: "https://github.com/c/1", sha: "def" },
        content: { html_url: "https://github.com/f/1" },
      },
    }));
    const client = createGitHubClient("tok", runtime);
    const result = await client.putFile({
      path: "src/domains/www.x.com.ts",
      content: "code\n",
      message: "Add domain tag www.x.com",
    });

    expect(result.commitUrl).toBe("https://github.com/c/1");
    const put = calls[0];
    expect(put.method).toBe("PUT");
    expect(put.url).toContain("/repos/MediaJel/mediajel-frictionless-custom-tag/contents/src/domains/www.x.com.ts");
    const body = put.body as Record<string, unknown>;
    expect(body.branch).toBe("master");
    expect(body.committer).toEqual(BOT_IDENTITY);
    expect(body.author).toEqual(BOT_IDENTITY);
    expect(body.sha).toBeUndefined();
    expect(atob(String(body.content))).toBe("code\n");
  });

  test("maps 401/403/404 to messages an operator can act on", async () => {
    for (const [status, needle] of [
      [401, "rejected the token"],
      [403, "Contents: write"],
      [404, "fine-grained tokens"],
    ] as const) {
      const { runtime } = fakeRuntime(() => ({ status, json: {} }));
      const client = createGitHubClient("tok", runtime);
      await expect(client.putFile({ path: "p.ts", content: "c", message: "m" })).rejects.toThrow(needle);
    }
  });
});

describe("deployTag", () => {
  test("refuses invalid code before any network call", async () => {
    const { runtime, calls } = fakeRuntime(() => ({ status: 201, json: {} }));
    const client = createGitHubClient("tok", runtime);
    await expect(
      deployTag({
        client,
        target: { kind: "app-id", name: "a", path: "src/app-ids/a.ts" },
        code: "window.overrides = {};",
        goal: "transaction",
        actor: { name: "J", email: "j@m.com" },
      }),
    ).rejects.toThrow("refusing to deploy");
    expect(calls).toHaveLength(0);
  });

  test("ships a valid tag and reports the update flag", async () => {
    const { runtime, calls } = fakeRuntime(() => ({
      status: 200,
      json: { commit: { html_url: "c", sha: "s" }, content: { html_url: "f" } },
    }));
    const client = createGitHubClient("tok", runtime);
    const outcome = await deployTag({
      client,
      target: { kind: "domain", name: "shop.terpsstation.com", path: "src/domains/shop.terpsstation.com.ts" },
      code: TEMPLATE_XHR,
      goal: "transaction",
      actor: { name: "Jane", email: "jane@m.com" },
      existingSha: "prev",
    });
    expect(outcome.update).toBe(true);
    const body = calls[0].body as Record<string, unknown>;
    expect(body.sha).toBe("prev");
    expect(String(body.message)).toStartWith("Update domain tag shop.terpsstation.com");
  });
});

describe("cdnUrl", () => {
  test("builds the exact base64-with-padding URL the tag fetches, or null without the env", () => {
    const base = process.env.FRICTIONLESS_CUSTOMTAG_URL;
    if (base) {
      expect(cdnUrl("domain", "www.example.com")).toBe(`${base}/domains/${btoa("www.example.com")}.js`);
    } else {
      expect(cdnUrl("domain", "www.example.com")).toBeNull();
    }
  });
});
