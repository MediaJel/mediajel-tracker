import { describe, expect, test } from "bun:test";

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
  mine?: OrgRef[];
  fail?: string;
  configured?: boolean;
}

/** A directory of a given shape, counting what it was asked so the cache can be proven. */
const directory = (tree: Tree) => {
  const asked = { owner: 0, user: 0, parents: 0 };
  const source: TagAccessSource = {
    configured: () => tree.configured !== false,
    async ownerOfTag() {
      asked.owner += 1;
      if (tree.fail) throw new Error(tree.fail);
      return tree.owner ?? null;
    },
    async orgsOfUser() {
      asked.user += 1;
      return tree.mine ?? [];
    },
    async parentsOf(ids) {
      asked.parents += 1;
      return [...ids].flatMap((id) => (tree.parents?.[id] ?? []).map(org));
    },
  };
  return { source, asked, service: new TagAccessService(source) };
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
  test("an app ID no org claims is refused, and says so", async () => {
    const { service } = directory({ owner: null, mine: [org("acme")] });

    const decision = await service.mayDeploy("app-nobody-owns", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("app-nobody-owns");
    expect(decision.reason).toContain("cannot tell whose tag it is");
  });

  test("a directory that cannot be reached refuses rather than letting the deploy through", async () => {
    const { service } = directory({ fail: "MediaJel's directory could not be reached (socket hang up)." });

    const decision = await service.mayDeploy("app-1", WHO);

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("could not be reached");
    expect(decision.reason).toContain("cannot be deployed from here");
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

  const refusing = { mayDeploy: async () => ({ allowed: false, reason: "This tag belongs to Org acme." }) } as never;

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
