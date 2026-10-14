import { describe, expect, spyOn, test } from "bun:test";
import { Logger } from "@nestjs/common";

import { ApiError } from "~/features/integrations-assistant/errors";
import { DeployService } from "~/features/integrations-assistant/services/deploy.service";
import { TagAccessService } from "~/features/integrations-assistant/services/tag-access.service";
import { ValidateService } from "~/features/integrations-assistant/services/validate.service";
import type { OrgRef, TagAccessSource } from "~/features/integrations-assistant/providers/tag-access.source";
import type { Authorized } from "~/features/integrations-assistant/types/assistant.types";

/**
 * Who may deploy a tag.
 *
 * A deploy commits to master of the frictionless repo with MediaJel's own credential and is live
 * minutes later, so the rule is checked here rather than trusted to the panel: the caller must be
 * in the org that owns the tag, or in one above it. Everything else — an unknown app ID, an
 * unreachable directory, a rejected key — is a refusal, and each refusal has to say which.
 */

const WHO: Authorized = {
  username: "j.doe",
  email: "j.doe@mediajel.com",
  name: "Jordan Doe",
  sub: "cognito-sub-1",
};

const org = (id: string): OrgRef => ({ id, name: `Org ${id}` });

interface Tree {
  /** orgId → its parents. */
  parents?: Record<string, string[]>;
  owner?: OrgRef | null;
  /** Every org claiming the app ID, when it is more than the one `owner`. */
  owners?: OrgRef[];
  mine?: OrgRef[];
  fail?: string;
  configured?: boolean;
}

/** MediaJel's own orgs, by id, as INTEGRATIONS_ASSISTANT_STAFF_ORG_IDS names them. */
const STAFF = "staff-1, staff-2";

/** A directory of a given shape, counting what it was asked so the cache can be proven. */
const directory = (tree: Tree, staff = STAFF) => {
  const asked = { owner: 0, user: 0, parents: 0, fresh: [] as boolean[] };
  const source: TagAccessSource = {
    configured: () => tree.configured !== false,
    async ownersOfTag(_appId, options = {}) {
      asked.owner += 1;
      asked.fresh.push(options.fresh ?? false);
      if (tree.fail) throw new Error(tree.fail);
      return tree.owners ?? (tree.owner ? [tree.owner] : []);
    },
    async orgsOfUser() {
      asked.user += 1;
      if (tree.fail) throw new Error(tree.fail);
      return tree.mine ?? [];
    },
    async parentsOf(ids) {
      asked.parents += 1;
      return [...ids].flatMap((id) => (tree.parents?.[id] ?? []).map(org));
    },
  };
  const config = { get: (key: string) => (key === "INTEGRATIONS_ASSISTANT_STAFF_ORG_IDS" ? staff : undefined) };
  return { source, asked, service: new TagAccessService(source, config as never) };
};

describe("who may deploy a tag", () => {
  test("a member of the org that owns it may", async () => {
    const { service } = directory({ owner: org("acme"), mine: [org("acme")] });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("");
    expect(decision.org?.id).toBe("acme");
  });

  test("a member of the org directly above it may", async () => {
    const { service } = directory({
      owner: org("acme"),
      mine: [org("partner")],
      parents: { acme: ["partner"] },
    });

    expect((await service.mayDeploy("app-1", WHO)).allowed).toBe(true);
  });

  test("a member of an org further up still may — the walk is not one level", async () => {
    const { service } = directory({
      owner: org("acme"),
      mine: [org("holding")],
      parents: { acme: ["partner"], partner: ["holding"] },
    });

    expect((await service.mayDeploy("app-1", WHO)).allowed).toBe(true);
  });

  test("a member of a sibling org may not — down and across is not up", async () => {
    const { service } = directory({
      owner: org("acme"),
      mine: [org("other")],
      parents: { acme: ["partner"], other: ["partner"] },
    });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("Org acme");
    expect(decision.reason).toContain("not in that org");
  });

  test("an account in no org at all may not, and is told that rather than that the tag is unknown", async () => {
    const { service } = directory({ owner: org("acme"), mine: [] });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("not a member of any org");
    expect(decision.org?.id).toBe("acme");
  });

  test("a cycle in the org tree ends the walk instead of hanging it", async () => {
    const { service, asked } = directory({
      owner: org("a"),
      mine: [org("stranger")],
      parents: { a: ["b"], b: ["a", "c"], c: ["b"] },
    });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(asked.parents).toBeLessThan(8);
  });
});

describe("what happens when the question cannot be answered", () => {
  test("a tag on no record is refused for someone outside MediaJel, and says so", async () => {
    const { service } = directory({ owner: null, mine: [org("acme")] });

    const decision = await service.mayDeploy("app-on-no-record", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("app-on-no-record");
    expect(decision.reason).toContain("cannot tell whose tag it is");
  });

  // About one tag in ten is on no target record — an older one, or one made outside the dashboard.
  // Refusing all of them would take the assistant away from the people who maintain exactly those.
  test("a tag on no record is allowed for MediaJel's own staff — the orgs listed by id, whatever they are called", async () => {
    for (const name of ["MediaJelAdmin", "Anything at all"]) {
      const { service } = directory({ owner: null, mine: [{ id: "staff-2", name }] });

      expect((await service.mayDeploy("app-on-no-record", WHO)).allowed).toBe(true);
    }
  });

  // A name is something an org's own admins can type, so a name can never be what makes staff.
  test("an org is never staff by its name, not even one called MediaJel", async () => {
    for (const name of ["MediaJel", "MediaJelAdmin", "MediaJelly Co"]) {
      const { service } = directory({ owner: null, mine: [{ id: "x", name }] });

      expect((await service.mayDeploy("app-on-no-record", WHO)).allowed).toBe(false);
    }
  });

  test("nobody is staff while the list is unset", async () => {
    const { service } = directory({ owner: null, mine: [{ id: "staff-1", name: "MediaJel" }] }, "");

    expect((await service.mayDeploy("app-on-no-record", WHO)).allowed).toBe(false);
  });

  test("a directory that cannot be reached refuses rather than letting the deploy through", async () => {
    const { service } = directory({ fail: "MediaJel's directory could not be reached (socket hang up)." });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("could not be reached");
    expect(decision.reason).toContain("will not work on this tag");
  });

  test("a service with no directory configured refuses every tag", async () => {
    const { service, asked } = directory({ configured: false, owner: org("acme"), mine: [org("acme")] });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("cannot check who owns this tag");
    expect(asked.owner).toBe(0);
  });
});

describe("the answer is kept for a while", () => {
  test("a second ask about the same tag does not ask the directory again", async () => {
    const { service, asked } = directory({ owner: org("acme"), mine: [org("acme")] });

    await service.mayDeploy("app-1", WHO);
    await service.mayDeploy("app-1", WHO);

    expect(asked.owner).toBe(1);
  });

  test("a different tag is a different question", async () => {
    const { service, asked } = directory({ owner: org("acme"), mine: [org("acme")] });

    await service.mayDeploy("app-1", WHO);
    await service.mayDeploy("app-2", WHO);

    expect(asked.owner).toBe(2);
  });

  // An account removed from an org, or a tag moved out of one, must stop deploying at once.
  test("a deploy asks again, and asks for the directory as it is now", async () => {
    const { service, asked } = directory({ owner: org("acme"), mine: [org("acme")] });

    await service.mayDeploy("app-1", WHO);
    await service.mayDeploy("app-1", WHO, { fresh: true });

    expect(asked.fresh).toEqual([false, true]);
    expect(asked.user).toBe(2);
  });

  test("a refusal that was a failure to ask is not kept, so the next request asks again", async () => {
    const tree: Tree = {
      owner: org("acme"),
      mine: [org("acme")],
      fail: "MediaJel's directory could not be reached (socket hang up).",
    };
    const { service } = directory(tree);

    expect((await service.mayDeploy("app-1", WHO)).allowed).toBe(false);
    delete tree.fail;
    expect((await service.mayDeploy("app-1", WHO)).allowed).toBe(true);
  });
});

describe("an app ID more than one org claims", () => {
  test("is refused to a caller who reaches only one of them — a record in one's own org cannot claim another's tag", async () => {
    const { service } = directory({ owners: [org("victim"), org("mine")], mine: [org("mine")] });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("More than one org claims app-1 (Org victim, Org mine)");
    expect(decision.org?.id).toBe("victim");
  });

  test("is allowed to a caller above every claimant", async () => {
    const { service } = directory({
      owners: [org("a"), org("b")],
      mine: [org("partner")],
      parents: { a: ["partner"], b: ["partner"] },
    });

    expect((await service.mayDeploy("app-1", WHO)).allowed).toBe(true);
  });
});

describe("domain files", () => {
  test("are staff-only, because nothing in the directory says whose site a hostname is", async () => {
    const client = await directory({ mine: [org("acme")] }).service.mayUseDomains(WHO);
    const staff = await directory({ mine: [org("staff-1")] }).service.mayUseDomains(WHO);

    expect(client.allowed).toBe(false);
    expect(client.reason).toContain("only MediaJel's own staff may work on one");
    expect(staff.allowed).toBe(true);
  });
});

describe("every decision made is on the record", () => {
  test("one line per decision, naming the account, the app ID and the rule — and none for a kept answer", async () => {
    const lines: string[] = [];
    const log = spyOn(Logger.prototype, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    try {
      const { service } = directory({ owner: null, mine: [org("staff-1")] });
      await service.mayDeploy("app-on-no-record", WHO);
      await service.mayDeploy("app-on-no-record", WHO);
    } finally {
      log.mockRestore();
    }

    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      {
        at: "tag-access",
        user: "j.doe",
        sub: "cognito-sub-1",
        appId: "app-on-no-record",
        rule: "unplaced",
        allowed: true,
      },
    ]);
  });
});

describe("a deploy asks before it commits", () => {
  const VALID = `import { CustomTag } from "../types";
export const tag: CustomTag = ({ trackTrans }) => {
  const seen = new Set<string>();
  document.addEventListener("x", () => {
    if (seen.has("1")) return;
    seen.add("1");
    trackTrans({ id: "1", total: 1, tax: 0, shipping: 0, city: "", state: "", country: "US", currency: "USD", items: [] });
  });
};
`;

  /** A GitHub that fails the test if it is touched at all. */
  const untouchable = () =>
    ({
      client: () => ({
        getFile: async () => {
          throw new Error("the repo was read despite the refusal");
        },
        putFile: async () => {
          throw new Error("a commit was made despite the refusal");
        },
      }),
      repo: "MediaJel/test",
    }) as never;

  const refusing = {
    mayDeploy: async () => ({ allowed: false, reason: "This tag belongs to Org acme." }),
    mayUseDomains: async () => ({ allowed: true, reason: "" }),
  } as never;

  test("a refused tag is a 403 that never reaches the repo", async () => {
    const deploy = new DeployService(untouchable(), new ValidateService(), refusing);

    const refused = await deploy
      .deploy(
        {
          goal: "transaction",
          kind: "domain",
          name: "shop.example.com",
          appId: "app-1",
          code: VALID,
        },
        WHO,
      )
      .catch((err: unknown) => err);

    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).getStatus()).toBe(403);
    expect((refused as ApiError).code).toBe("not_your_tag");
    expect((refused as ApiError).message).toContain("Org acme");
  });

  test("an edit to a tag's configuration is refused the same way", async () => {
    const deploy = new DeployService(untouchable(), new ValidateService(), refusing);

    const refused = await deploy
      .deployOverrides({ appId: "app-1", edits: { "s3.pv": "x" } }, WHO)
      .catch((err: unknown) => err);

    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).getStatus()).toBe(403);
  });
});
