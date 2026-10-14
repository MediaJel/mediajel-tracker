import { describe, expect, test } from "bun:test";

import { ApiError } from "~/features/integrations-assistant/errors";
import type { Freshness } from "~/features/integrations-assistant/providers/tag-access.source";
import { DeployService } from "~/features/integrations-assistant/services/deploy.service";
import { ValidateService } from "~/features/integrations-assistant/services/validate.service";
import { createGitHubClient, githubToken } from "~/features/integrations-assistant/services/github.service";
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

/** Who owns the tag is a separate question with its own tests; here it is answered yes unless a test says otherwise. */
const access = (decision = { allowed: true, reason: "" }) =>
  ({ mayDeploy: async () => decision, mayUseDomains: async () => decision }) as never;

const service = (
  existing: { sha: string; content: string } | null,
  recorded: Recorded = {},
  permission = access(),
): DeployService => new DeployService(github(existing, recorded), new ValidateService(), permission);

const request = (over: Partial<Parameters<DeployService["deploy"]>[0]> = {}) =>
  ({
    goal: "transaction",
    kind: "domain",
    name: "shop.example.com",
    appId: "5f976cbb-7d29-46ce-bf07-0f701478d800",
    code: VALID,
    ...over,
  }) as Parameters<DeployService["deploy"]>[0];

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
    expect(await service(null).readTag("domain", "shop.example.com", WHO)).toEqual({ exists: false });
  });

  test("hands back the sha the commit will be made against", async () => {
    expect(await service({ sha: "abc", content: "existing" }).readTag("domain", "shop.example.com", WHO)).toEqual({
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
    const preview = await service({ sha: "abc", content: FILE }, recorded).previewOverrides(edit(), WHO);
    expect(preview.path).toBe(`src/app-ids/${APP}.ts`);
    expect(preview).toMatchObject({ exists: true, sha: "abc", before: FILE, changed: true });
    expect(preview.after).toBe(`${FILE}\n${preview.block}\n`);
    expect(recorded.put).toBeUndefined();
  });

  test("an edit that takes the block out still has a version, for the page to try the file without it", async () => {
    const preview = await service({ sha: "abc", content: FILE }).previewOverrides(edit({ edits: {} }), WHO);
    expect(preview.block).toBeNull();
    expect(preview.version).toMatch(/^v-[0-9a-f]{8}$/);
  });

  test("a tag with no app-id file yet previews a new file holding only the block", async () => {
    const preview = await service(null).previewOverrides(edit(), WHO);
    expect(preview).toMatchObject({ exists: false, before: "", changed: true });
    expect(preview.after).toBe(`${preview.block}\n`);
  });

  test("commits the previewed bytes below the file's own code, attributed to the verified identity", async () => {
    const recorded: Recorded = {};
    const deploy = service({ sha: "abc", content: FILE }, recorded);
    const preview = await deploy.previewOverrides(edit(), WHO);
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
    const withBlock = (await service({ sha: "abc", content: FILE }).previewOverrides(edit(), WHO)).after;
    await service({ sha: "def", content: withBlock }, recorded).deployOverrides(
      edit({ edits: {}, expectedSha: "def" }),
      WHO,
    );
    expect(recorded.put?.content).toBe(FILE);
    expect(recorded.put?.message).toStartWith(`Remove the configuration overrides for app-id ${APP}`);
  });

  test("a file that already holds exactly this configuration is refused rather than committed again", async () => {
    const withBlock = (await service({ sha: "abc", content: FILE }).previewOverrides(edit(), WHO)).after;
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
    const withBlock = (await service(null).previewOverrides({ appId: APP, edits: { "s3.pv": "Edited" } }, WHO)).after;
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

/**
 * Which tag's permission a route needs, asked before the repo is touched.
 *
 * The first version checked a deploy's `appId` and wrote the file named by its `name`, read any
 * client's file through the tag read and the overrides preview, and let anyone write a domain file.
 * Each of those is a case here, and in each the repo is never read or written.
 */
describe("which tag's permission a route needs", () => {
  /** Answers per app ID and for domain files, recording what it was asked and how fresh. */
  const asking = (refuse: { tags?: string[]; domains?: boolean } = {}) => {
    const asked: { about: string; options: Freshness }[] = [];
    const answer = (refused: boolean) => ({
      allowed: !refused,
      reason: refused ? "This tag belongs to Org acme." : "",
    });
    const access = {
      mayDeploy: async (appId: string, _who: Authorized, options: Freshness = {}) => {
        asked.push({ about: appId, options });
        return answer(refuse.tags?.includes(appId) ?? false);
      },
      mayUseDomains: async (_who: Authorized, options: Freshness = {}) => {
        asked.push({ about: "domains", options });
        return answer(refuse.domains ?? false);
      },
    };
    return { asked, access: access as never };
  };

  /** A repo that records every read and write. */
  const watched = () => {
    const touched: string[] = [];
    const client: GitHubClient = {
      getFile: async (path) => {
        touched.push(`get ${path}`);
        return null;
      },
      putFile: async (input) => {
        touched.push(`put ${input.path}`);
        return { commitUrl: "https://github.com/c/1", fileUrl: "https://github.com/f/1", sha: "new-sha" };
      },
    };
    return { touched, github: { client: () => client, repo: "MediaJel/test" } as never };
  };

  const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";

  const setup = (refuse: { tags?: string[]; domains?: boolean } = {}) => {
    const { asked, access } = asking(refuse);
    const { touched, github } = watched();
    return { asked, touched, deploy: new DeployService(github, new ValidateService(), access) };
  };

  const refusal = async (attempt: Promise<unknown>): Promise<ApiError> => {
    const err = await attempt.then(
      () => new Error("expected a refusal"),
      (caught: unknown) => caught,
    );
    expect(err).toBeInstanceOf(ApiError);
    return err as ApiError;
  };

  test("an app-id deploy whose name is not the app ID it was checked on is a 400, before anything is asked or read", async () => {
    const { deploy, asked, touched } = setup();

    const err = await refusal(deploy.deploy(request({ kind: "app-id", name: "another-tag", appId: APP }), WHO));

    expect(err.getStatus()).toBe(400);
    expect(err.message).toContain(`name (another-tag) must be ${APP}`);
    expect(asked).toEqual([]);
    expect(touched).toEqual([]);
  });

  test("an app-id deploy asks about its own app ID, fresh, and writes the file named by it", async () => {
    const { deploy, asked, touched } = setup();

    await deploy.deploy(request({ kind: "app-id", name: APP, appId: APP }), WHO);

    expect(asked).toEqual([{ about: APP, options: { fresh: true } }]);
    expect(touched).toEqual([`get src/app-ids/${APP}.ts`, `put src/app-ids/${APP}.ts`]);
  });

  test("a domain file is written for staff only, and the job's app ID is still asked about", async () => {
    const outsider = setup({ domains: true });
    const staff = setup({ tags: [APP] });

    expect((await refusal(outsider.deploy.deploy(request(), WHO))).getStatus()).toBe(403);
    expect((await refusal(staff.deploy.deploy(request(), WHO))).getStatus()).toBe(403);
    expect(staff.asked).toEqual([
      { about: "domains", options: { fresh: true } },
      { about: APP, options: { fresh: true } },
    ]);
    expect([...outsider.touched, ...staff.touched]).toEqual([]);
  });

  test("reading an app-id file asks about the app ID it is named by, and reads nothing of another org's", async () => {
    const { deploy, asked, touched } = setup({ tags: ["another-tag"] });

    expect((await refusal(deploy.readTag("app-id", "another-tag", WHO))).getStatus()).toBe(403);
    expect(asked).toEqual([{ about: "another-tag", options: {} }]);
    expect(touched).toEqual([]);
  });

  test("reading a domain file is staff-only", async () => {
    const { deploy, touched } = setup({ domains: true });

    expect((await refusal(deploy.readTag("domain", "shop.example.com", WHO))).getStatus()).toBe(403);
    expect(touched).toEqual([]);
  });

  test("an edit is not previewed — its file is not read — for a tag this account may not work on, and is deployed fresh", async () => {
    const refused = setup({ tags: ["another-tag"] });
    const allowed = setup();

    expect(
      (
        await refusal(refused.deploy.previewOverrides({ appId: "another-tag", edits: { "s3.pv": "x" } }, WHO))
      ).getStatus(),
    ).toBe(403);
    await allowed.deploy.deployOverrides({ appId: APP, edits: { "s3.pv": "x" } }, WHO);

    expect(refused.touched).toEqual([]);
    expect(allowed.asked).toEqual([{ about: APP, options: { fresh: true } }]);
  });
});

describe("a GitHub that does not answer", () => {
  const failing = (err: unknown) => (async () => Promise.reject(err)) as never;

  test("every call carries a limit of its own", async () => {
    let signal: AbortSignal | null | undefined;
    const fetchImpl = (async (_input: string, init?: RequestInit) => {
      signal = init?.signal;
      return new Response(null, { status: 404 });
    }) as never;

    await createGitHubClient("token", "MediaJel/tags", fetchImpl).getFile("src/app-ids/a.ts");

    expect(signal).toBeInstanceOf(AbortSignal);
  });

  test("is a 504 that names the service when the call runs out of time", async () => {
    const timedOut = new DOMException("The operation timed out.", "TimeoutError");

    const err = await createGitHubClient("token", "MediaJel/tags", failing(timedOut))
      .getFile("src/app-ids/a.ts")
      .catch((caught: unknown) => caught);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).getStatus()).toBe(504);
    expect((err as ApiError).message).toBe("GitHub did not answer within 20 seconds. Try again.");
  });

  test("is a 502 when GitHub cannot be reached at all", async () => {
    const err = await createGitHubClient("token", "MediaJel/tags", failing(new TypeError("fetch failed")))
      .putFile({ path: "src/app-ids/a.ts", content: "x", message: "m" })
      .catch((caught: unknown) => caught);

    expect((err as ApiError).getStatus()).toBe(502);
    expect((err as ApiError).message).toBe("GitHub could not be reached (fetch failed). Try again.");
  });
});
