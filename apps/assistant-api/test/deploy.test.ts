import { describe, expect, test } from "bun:test";

import { DeployService } from "~/features/integrations-assistant/services/deploy.service";
import { ValidateService } from "~/features/integrations-assistant/services/validate.service";
import { githubToken } from "~/features/integrations-assistant/services/github.service";
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

describe("a service with no deploy credential", () => {
  /**
   * The panel decides whether to block its Deploy step by matching this message. That makes the
   * wording a contract, not prose: reword it freely, but "deploy credential" has to survive, or
   * the operator silently gets the old behaviour — a Deploy button that looks fine and 500s.
   */
  test("says so in words the panel can recognise", () => {
    expect(() => githubToken(undefined)).toThrow(/deploy credential/i);
    expect(() => githubToken("   ")).toThrow(/deploy credential/i);
  });

  test("names the variable a MediaJel engineer has to set", () => {
    expect(() => githubToken("")).toThrow(/GITHUB_TOKEN/);
  });

  test("a configured credential is let through untouched", () => {
    expect(githubToken("  ghp_real  ")).toBe("ghp_real");
  });
});

describe("an edit to a tag's configuration", () => {
  const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";
  const FILE = 'const tag = () => {\n  window.overrides = { "s3.pv": "test3" };\n};\n\ntag();\n';
  const edit = (over: Partial<Parameters<DeployService["deployOverrides"]>[0]> = {}) => ({
    appId: APP,
    edits: { "s3.pv": "Edited" },
    ...over,
  });

  test("previews the app-id file before and after, with the block the page runs, and commits nothing", async () => {
    const recorded: Recorded = {};
    const preview = await service({ sha: "abc", content: FILE }, recorded).previewOverrides(edit());
    expect(preview.path).toBe(`src/app-ids/${APP}.ts`);
    expect(preview).toMatchObject({ exists: true, sha: "abc", before: FILE, changed: true });
    expect(preview.after).toBe(`${FILE}\n${preview.block}\n`);
    expect(recorded.put).toBeUndefined();
  });

  test("an edit that takes the block out still has a version, for the page to try the file without it", async () => {
    const preview = await service({ sha: "abc", content: FILE }).previewOverrides(edit({ edits: {} }));
    expect(preview.block).toBeNull();
    expect(preview.version).toMatch(/^v-[0-9a-f]{8}$/);
  });

  test("a tag with no app-id file yet previews a new file holding only the block", async () => {
    const preview = await service(null).previewOverrides(edit());
    expect(preview).toMatchObject({ exists: false, before: "", changed: true });
    expect(preview.after).toBe(`${preview.block}\n`);
  });

  test("commits the previewed bytes below the file's own code, attributed to the verified identity", async () => {
    const recorded: Recorded = {};
    const deploy = service({ sha: "abc", content: FILE }, recorded);
    const preview = await deploy.previewOverrides(edit());
    const result = await deploy.deployOverrides(edit({ expectedSha: "abc" }), WHO);
    expect(recorded.put?.content).toBe(preview.after);
    expect(recorded.put?.sha).toBe("abc");
    expect(recorded.put?.message).toBe(
      `Update the configuration overrides for app-id ${APP}\n\nEdited by: Pacholo Amit (pacholo@mediajel.com)`,
    );
    expect(result.update).toBe(true);
  });

  test("no edits take the tag's block back out", async () => {
    const recorded: Recorded = {};
    const withBlock = (await service({ sha: "abc", content: FILE }).previewOverrides(edit())).after;
    await service({ sha: "def", content: withBlock }, recorded).deployOverrides(
      edit({ edits: {}, expectedSha: "def" }),
      WHO,
    );
    expect(recorded.put?.content).toBe(FILE);
    expect(recorded.put?.message).toStartWith(`Remove the configuration overrides for app-id ${APP}`);
  });

  test("a file that already holds exactly this configuration is refused rather than committed again", async () => {
    const withBlock = (await service({ sha: "abc", content: FILE }).previewOverrides(edit())).after;
    await expect(
      service({ sha: "def", content: withBlock }).deployOverrides(edit({ expectedSha: "def" }), WHO),
    ).rejects.toThrow("already holds exactly this configuration");
  });

  test("is checked against the sha the operator was shown, like any deploy", async () => {
    await expect(
      service({ sha: "abc", content: FILE }).deployOverrides(edit({ expectedSha: "stale" }), WHO),
    ).rejects.toThrow("changed in the repo while you were working");
  });
});

describe("a deploy from the Tracking setup onto a file holding a tag's configuration", () => {
  const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";

  test("keeps the block below the new code, and the rule against window.overrides reads only the file's own code", async () => {
    const withBlock = (await service(null).previewOverrides({ appId: APP, edits: { "s3.pv": "Edited" } })).after;
    const recorded: Recorded = {};
    await service({ sha: "abc", content: withBlock }, recorded).deploy(
      request({ kind: "app-id", name: APP, expectedSha: "abc" }),
      WHO,
    );
    expect(recorded.put?.content.startsWith(VALID)).toBe(true);
    expect(recorded.put?.content).toContain(`/* mediajel-assistant:overrides ${APP} begin`);
    expect(
      new ValidateService().validate({ code: recorded.put!.content, goal: "transaction", appIdTarget: true }),
    ).toEqual([]);
  });
});
