import { afterEach, describe, expect, test } from "bun:test";

import { GqlTagAccessSource } from "~/features/integrations-assistant/providers/gql-tag-access.source";
import type { Authorized } from "~/features/integrations-assistant/types/assistant.types";

/**
 * The HTTP half of the permission check: what MediaJel's directory is asked, and what its refusals
 * become.
 *
 * `fetch` is swapped on the global the way the activity source's tests do it, for the same reason —
 * this binding is replaced wholesale when the module moves, and its replacement will not take a
 * fetch parameter. The identifiers asserted here are the ones that actually resolve a MediaJel
 * account, which is the part most easily got wrong: the ID token's `cognito:username`, not its
 * `sub`, is what the directory stores as `User.username`.
 */

const CONFIGURED = { GQL_SERVICE_URL: "https://directory.test/", GQL_SERVICE_API_KEY: "test-key" };

const sourceWith = (values: Record<string, string | undefined> = CONFIGURED): GqlTagAccessSource =>
  new GqlTagAccessSource({ get: (key: string) => values[key] } as never);

const WHO: Authorized = { username: "j.doe", email: "j@mediajel.com", name: "Jordan Doe", sub: "cognito-sub-1" };

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

interface Sent {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  key: string;
}

/** Answers each request in turn with the given bodies, recording what was asked. */
const directoryAnswers = (...bodies: unknown[]): Sent[] => {
  const sent: Sent[] = [];
  let turn = 0;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> };
    sent.push({
      url,
      query: body.query,
      variables: body.variables,
      key: (init.headers as Record<string, string>)["X-API-Key"],
    });
    const answer = bodies[Math.min(turn, bodies.length - 1)];
    turn += 1;
    return new Response(JSON.stringify(answer), { status: 200 });
  }) as unknown as typeof fetch;
  return sent;
};

describe("what the directory is asked", () => {
  test("the caller's orgs are looked up by username — the claim the directory stores", async () => {
    const sent = directoryAnswers({ data: { users: [{ orgs: [{ id: "o1", name: "Acme" }], roles: [] }] } });

    const orgs = await sourceWith().orgsOfUser(WHO);

    expect(sent).toHaveLength(1);
    expect(sent[0].variables.where).toEqual({ username: "j.doe" });
    expect(sent[0].key).toBe("test-key");
    expect(orgs).toEqual([{ id: "o1", name: "Acme" }]);
  });

  test("an org held only through a role counts, and a role and a list naming it twice count once", async () => {
    directoryAnswers({
      data: {
        users: [
          {
            orgs: [{ id: "o1", name: "Acme" }],
            roles: [{ org: { id: "o1", name: "Acme" } }, { org: { id: "o2", name: "Partner" } }, { org: null }],
          },
        ],
      },
    });

    const orgs = await sourceWith().orgsOfUser(WHO);

    expect(orgs).toEqual([
      { id: "o1", name: "Acme" },
      { id: "o2", name: "Partner" },
    ]);
  });

  test("a username the directory does not know is asked again by cognito id, and no user is no orgs", async () => {
    const sent = directoryAnswers({ data: { users: [] } });

    const orgs = await sourceWith().orgsOfUser(WHO);

    expect(sent.map((ask) => ask.variables.where)).toEqual([{ username: "j.doe" }, { cognitoUserId: "cognito-sub-1" }]);
    expect(orgs).toEqual([]);
  });

  // The owner cannot be asked for directly: a target's app IDs are a scalar list, and Prisma 1
  // generates no filter for those. The source reads the targets once and keeps the index.
  test("the tag's owner is the org of the target whose app IDs include it, read in a stable order", async () => {
    const sent = directoryAnswers({
      data: {
        eventsTargets: [
          { eventTags: [{ appId: ["other-tag"] }], orgs: [{ id: "o1", name: "Somebody Else" }] },
          { eventTags: [{ appId: ["app-1", "app-2"] }], orgs: [{ id: "o9", name: "Acme Cannabis" }] },
        ],
      },
    });

    const owners = await sourceWith().ownersOfTag("app-1");

    expect(sent[0].query).toContain("eventsTargets");
    // Without a stable sort, `skip` paging can skip a target — and with it a claim on its app id.
    expect(sent[0].query).toContain("orderBy: id_ASC");
    expect(sent[0].variables).toEqual({ first: 1000, skip: 0 });
    expect(owners).toEqual([{ id: "o9", name: "Acme Cannabis" }]);
  });

  test("every org that claims an app ID is named — across targets, and within one shared target", async () => {
    directoryAnswers({
      data: {
        eventsTargets: [
          { eventTags: [{ appId: ["shared"] }], orgs: [{ id: "a", name: "A" }] },
          {
            eventTags: [{ appId: ["shared"] }],
            orgs: [
              { id: "b", name: "B" },
              { id: "c", name: "C" },
            ],
          },
          { eventTags: [{ appId: ["shared"] }], orgs: [{ id: "a", name: "A" }] },
        ],
      },
    });

    expect((await sourceWith().ownersOfTag("shared")).map((org) => org.id)).toEqual(["a", "b", "c"]);
  });

  test("the index is read once and answers every tag after it", async () => {
    const sent = directoryAnswers({
      data: {
        eventsTargets: [
          { eventTags: [{ appId: ["app-1"] }, { appId: ["app-2"] }], orgs: [{ id: "o9", name: "Acme" }] },
        ],
      },
    });
    const source = sourceWith();

    expect(await source.ownersOfTag("app-1")).toEqual([{ id: "o9", name: "Acme" }]);
    expect(await source.ownersOfTag("app-2")).toEqual([{ id: "o9", name: "Acme" }]);
    expect(await source.ownersOfTag("app-3")).toEqual([]);
    expect(sent).toHaveLength(1);
  });

  test("a fresh ask reads the directory again, as a deploy does", async () => {
    const sent = directoryAnswers({
      data: { eventsTargets: [{ eventTags: [{ appId: ["app-1"] }], orgs: [{ id: "o9", name: "Acme" }] }] },
    });
    const source = sourceWith();

    await source.ownersOfTag("app-1");
    await source.ownersOfTag("app-1", { fresh: true });

    expect(sent).toHaveLength(2);
  });

  test("askers who arrive together share one read", async () => {
    const sent = directoryAnswers({
      data: { eventsTargets: [{ eventTags: [{ appId: ["app-1"] }], orgs: [{ id: "o9", name: "Acme" }] }] },
    });
    const source = sourceWith();

    await Promise.all(Array.from({ length: 5 }, () => source.ownersOfTag("app-1")));

    expect(sent).toHaveLength(1);
  });

  test("a target with no org owns nothing, and a target on no record is no owner rather than an error", async () => {
    directoryAnswers({
      data: { eventsTargets: [{ eventTags: [{ appId: ["orphan"] }], orgs: [] }] },
    });

    expect(await sourceWith().ownersOfTag("orphan")).toEqual([]);
  });

  test("a full page is followed by the next one, until a short page ends it", async () => {
    const full = { eventTags: [{ appId: ["x"] }], orgs: [{ id: "o", name: "Org" }] };
    const sent = directoryAnswers(
      { data: { eventsTargets: Array.from({ length: 1000 }, () => full) } },
      { data: { eventsTargets: [{ eventTags: [{ appId: ["app-last"] }], orgs: [{ id: "o2", name: "Last" }] }] } },
    );

    expect(await sourceWith().ownersOfTag("app-last")).toEqual([{ id: "o2", name: "Last" }]);
    expect(sent.map((ask) => ask.variables.skip)).toEqual([0, 1000]);
  });

  // "No record" is a decision of its own — staff-only — so a list cut off at the page limit would
  // decide for every tag past it. A directory too long to read whole is an error instead.
  test("a directory longer than the source reads is refused rather than read in part", async () => {
    const full = { eventTags: [{ appId: ["x"] }], orgs: [{ id: "o", name: "Org" }] };
    directoryAnswers({ data: { eventsTargets: Array.from({ length: 1000 }, () => full) } });

    await expect(sourceWith().ownersOfTag("x")).rejects.toThrow("lists more than 12000 tag records");
  });

  test("a level of parents is asked for every org at once, and duplicates collapse", async () => {
    const sent = directoryAnswers({
      data: {
        orgs: [
          { id: "a", parentOrg: [{ id: "p", name: "Partner" }] },
          { id: "b", parentOrg: [{ id: "p", name: "Partner" }, null] },
        ],
      },
    });

    const parents = await sourceWith().parentsOf(["a", "b"]);

    expect(sent[0].variables).toEqual({ ids: ["a", "b"] });
    expect(parents).toEqual([{ id: "p", name: "Partner" }]);
  });

  test("no orgs to ask about is no request at all", async () => {
    const sent = directoryAnswers({ data: { orgs: [] } });

    expect(await sourceWith().parentsOf([])).toEqual([]);
    expect(sent).toHaveLength(0);
  });
});

describe("what its refusals become", () => {
  test("a GraphQL error is the directory refusing the question, in its own words", async () => {
    directoryAnswers({ errors: [{ message: "Not Authorised!" }] });

    await expect(sourceWith().ownersOfTag("app-1")).rejects.toThrow(
      "MediaJel's directory refused the question: Not Authorised!",
    );
  });

  test("a read that failed is not kept: the next ask reads again", async () => {
    directoryAnswers(
      { errors: [{ message: "Not Authorised!" }] },
      { data: { eventsTargets: [{ eventTags: [{ appId: ["app-1"] }], orgs: [{ id: "o9", name: "Acme" }] }] } },
    );
    const source = sourceWith();

    await expect(source.ownersOfTag("app-1")).rejects.toThrow("Not Authorised!");
    expect(await source.ownersOfTag("app-1")).toEqual([{ id: "o9", name: "Acme" }]);
  });

  test("a connection that fails names the service that did not answer", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    await expect(sourceWith().ownersOfTag("app-1")).rejects.toThrow(
      "MediaJel's directory could not be reached (fetch failed).",
    );
  });

  test("without a URL and a key it says it is not configured rather than asking nothing", () => {
    expect(sourceWith({}).configured()).toBe(false);
    expect(sourceWith(CONFIGURED).configured()).toBe(true);
  });
});
