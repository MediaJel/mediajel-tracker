import { describe, expect, test } from "bun:test";

import { DeployService } from "~/features/integrations-assistant/services/deploy.service";
import { ValidateService } from "~/features/integrations-assistant/services/validate.service";
import type { GitHubClient } from "~/features/integrations-assistant/services/github.service";
import type { Authorized } from "~/features/integrations-assistant/types/assistant.types";

/**
 * The deploy gate.
 *
 * This is the one endpoint that writes with MediaJel's own credential, to a repo whose master
 * branch goes live within minutes and whose build a syntax error freezes for everyone. So the
 * tests that matter are the refusals: a file that fails validation, and a file whose sha moved
 * while the operator was reading it.
 */

const WHO: Authorized = { username: "pacholo", email: "pacholo@mediajel.com", name: "Pacholo Amit", sub: "s-1" };

const VALID = `import { fetchSource } from "../libs/sources/fetch-source";

fetchSource("/checkout", function (body) {
  var orderId = String(body.id);
  if (localStorage.getItem("mj-shop-" + orderId)) return;
  localStorage.setItem("mj-shop-" + orderId, "1");
  window.trackTrans({ id: orderId, total: body.total, tax: 0, shipping: 0, city: "N/A", state: "N/A", country: "N/A", currency: "USD", items: [] });
});
`;

interface Recorded {
  put?: { path: string; content: string; message: string; sha?: string };
}

const github = (existing: { sha: string; content: string } | null, recorded: Recorded = {}) => {
  const client: GitHubClient = {
    getFile: async () => existing,
    putFile: async (input) => {
      recorded.put = input;
      return { commitUrl: "https://github.com/c/1", fileUrl: "https://github.com/f/1", sha: "new-sha" };
    },
  };
  return { client: () => client, repo: "MediaJel/test" } as never;
};

const service = (existing: { sha: string; content: string } | null, recorded: Recorded = {}): DeployService =>
  new DeployService(github(existing, recorded), new ValidateService());

const request = (over: Partial<Parameters<DeployService["deploy"]>[0]> = {}) =>
  ({ goal: "transaction", kind: "domain", name: "shop.example.com", code: VALID, ...over }) as Parameters<
    DeployService["deploy"]
  >[0];

describe("the path a target becomes", () => {
  test("is the folder the tag fetches by name, for both kinds", () => {
    const deploy = service(null);
    expect(deploy.targetPath("domain", "shop.example.com")).toBe("src/domains/shop.example.com.ts");
    expect(deploy.targetPath("app-id", "abc123")).toBe("src/app-ids/abc123.ts");
  });
});

describe("a file that fails validation", () => {
  test("is refused before GitHub is touched at all", async () => {
    const recorded: Recorded = {};
    await expect(service(null, recorded).deploy(request({ code: "console.log('nope');" }), WHO)).rejects.toThrow(
      "Refusing to deploy",
    );
    expect(recorded.put).toBeUndefined();
  });

  test("names every violation, so the operator can see what is wrong with it", async () => {
    await expect(service(null).deploy(request({ code: "console.log('nope');" }), WHO)).rejects.toThrow(
      "the file never calls window.trackTrans(",
    );
  });
});

describe("the sha the operator was shown", () => {
  test("a file that appeared while they worked is a conflict, not an overwrite", async () => {
    await expect(service({ sha: "abc", content: "existing" }).deploy(request(), WHO)).rejects.toThrow(
      "exists now but did not when you started",
    );
  });

  test("a file that moved under them is a conflict, not an overwrite", async () => {
    await expect(
      service({ sha: "abc", content: "existing" }).deploy(request({ expectedSha: "stale" }), WHO),
    ).rejects.toThrow("changed in the repo while you were working");
  });

  test("a file that was deleted under them is a conflict too", async () => {
    await expect(service(null).deploy(request({ expectedSha: "abc" }), WHO)).rejects.toThrow(
      "was deleted while you were working",
    );
  });
});

describe("a clean deploy", () => {
  test("commits the exact bytes, newline-terminated", async () => {
    const recorded: Recorded = {};
    const result = await service(null, recorded).deploy(request(), WHO);

    expect(recorded.put?.path).toBe("src/domains/shop.example.com.ts");
    expect(recorded.put?.content.endsWith("\n")).toBe(true);
    expect(result.update).toBe(false);
    expect(result.commitUrl).toBe("https://github.com/c/1");
  });

  test("attributes the commit to the verified identity, not to a typed-in name", async () => {
    const recorded: Recorded = {};
    await service(null, recorded).deploy(request(), WHO);

    expect(recorded.put?.message).toBe(
      "Add domain tag shop.example.com\n\nCreated by: Pacholo Amit (pacholo@mediajel.com)",
    );
  });

  test("an update carries the sha it read, and says so in the message", async () => {
    const recorded: Recorded = {};
    const result = await service({ sha: "abc", content: "old" }, recorded).deploy(request({ expectedSha: "abc" }), WHO);

    expect(recorded.put?.sha).toBe("abc");
    expect(recorded.put?.message).toStartWith("Update domain tag shop.example.com");
    expect(result.update).toBe(true);
  });
});

describe("reading the tag a deploy would replace", () => {
  test("reports a missing file as absent rather than as an error", async () => {
    expect(await service(null).readTag("domain", "shop.example.com")).toEqual({ exists: false });
  });

  test("hands back the sha the commit will be made against", async () => {
    expect(await service({ sha: "abc", content: "existing" }).readTag("domain", "shop.example.com")).toEqual({
      exists: true,
      sha: "abc",
      content: "existing",
    });
  });
});
