import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Authorized } from "../types/assistant.types";
import { unanswered } from "./service-failure";
import type { OrgRef, TagAccessSource } from "./tag-access.source";

/**
 * gql-service over `fetch`, with the machine key it accepts in place of a session.
 *
 * Three questions, and the shapes the directory actually holds — checked against production, because
 * several fields that look like the answer are not:
 *
 * - **The caller's orgs.** By `username`, which is the ID token's `cognito:username` claim: that is
 *   the lookup gql-service's own auth layer does. `cognitoUserId` looks like the home of the token's
 *   `sub` and is not (a dashboard signup stores the username there, a federated one an Identity Pool
 *   id), so it is only tried second. Membership is read from `roles[].org` **and** `orgs`, because
 *   the plain list comes back empty for real accounts that plainly have orgs.
 * - **The tag's owner.** A tag is an `EventsTarget` — what the dashboard's own Tags page lists —
 *   whose `eventTags[].appId` holds its app IDs and whose `orgs` is the advertiser. That `appId` is
 *   a scalar LIST, and Prisma 1 generates no filter for those, so no query can ask "which target has
 *   this app ID". The index below is that missing query: one paged read of every target's app IDs
 *   and org, held for a few minutes and shared by every caller. `OrgTagsConfig.appId`,
 *   `OrgDataConfig.appIds` and `Campaign.appId` were each checked first and hold the legacy short
 *   names ("MediaJel", "Proze"), never the tracker's UUIDs.
 * - **The orgs above one.** `Org.parentOrg` is a list, and the app flattens the whole chain into it
 *   when an org moves, so one hop usually answers. The walk above still climbs a level at a time,
 *   because "usually" is not "always".
 *
 * Failures are plain `Error`s. The policy above turns every one of them into a refusal, because a
 * permission question that could not be answered is not a yes.
 */

const TIMEOUT_MS = 30_000;

/** What the operator calls it: gql-service is the directory of orgs, users and whose tag is whose. */
const DIRECTORY = "MediaJel's directory";

/** How long a built index stands. Tags are made by hand, minutes apart at most. */
const INDEX_TTL_MS = 10 * 60_000;

/** One read of the targets list: 1,000 of them came back in ~100KB and about a second. */
const PAGE = 1000;

/** Enough pages for several times the present corpus, and a stop for a directory that never ends. */
const MAX_PAGES = 12;

const ORGS_OF_USER = `query AssistantUserOrgs($where: UserWhereInput) {
  users(where: $where, first: 1) { id orgs { id name } roles { org { id name } } }
}`;

const TAG_INDEX = `query AssistantTagIndex($first: Int, $skip: Int) {
  eventsTargets(first: $first, skip: $skip) { eventTags { appId } orgs { id name } }
}`;

const PARENTS_OF = `query AssistantOrgParents($ids: [ID!]) {
  orgs(where: { id_in: $ids }) { id parentOrg { id name } }
}`;

interface GqlBody<T> {
  data?: T;
  errors?: unknown;
}

type UserOrgs = { users: { orgs: OrgRef[] | null; roles: { org: OrgRef | null }[] | null }[] | null };
type TagIndex = { eventsTargets: { eventTags: { appId: string[] | null }[] | null; orgs: OrgRef[] | null }[] };
type Parents = { orgs: { id: string; parentOrg: (OrgRef | null)[] | null }[] };

/** GraphQL answers a refused key with 200 and an `errors` array as readily as with a status. */
const said = (errors: unknown): string => {
  const list = Array.isArray(errors) ? errors : [];
  const messages = list
    .map((entry) => (entry as { message?: unknown })?.message)
    .filter((message): message is string => typeof message === "string");
  return messages.join("; ");
};

/** Every app ID a page of targets claims, paired with the org that owns the target. */
const ownersIn = (page: TagIndex): [string, OrgRef][] => {
  const pairs: [string, OrgRef][] = [];
  for (const target of page.eventsTargets ?? []) {
    const org = (target.orgs ?? [])[0];
    if (!org) continue;
    for (const tag of target.eventTags ?? []) {
      for (const appId of tag.appId ?? []) pairs.push([appId, org]);
    }
  }
  return pairs;
};

@Injectable()
export class GqlTagAccessSource implements TagAccessSource {
  private index: { at: number; owners: Map<string, OrgRef> } | null = null;

  constructor(private readonly config: ConfigService) {}

  configured(): boolean {
    return !!(this.endpoint() && this.key());
  }

  async orgsOfUser(who: Authorized): Promise<OrgRef[]> {
    const byName = await this.userOrgs({ username: who.username });
    return byName ?? (await this.userOrgs({ cognitoUserId: who.sub })) ?? [];
  }

  async ownerOfTag(appId: string): Promise<OrgRef | null> {
    return (await this.owners()).get(appId) ?? null;
  }

  async parentsOf(orgIds: readonly string[]): Promise<OrgRef[]> {
    if (orgIds.length === 0) return [];
    const found = await this.ask<Parents>(PARENTS_OF, { ids: [...orgIds] });
    // The schema says [Org!], but this is another service's JSON: a hole in the list would other-
    // wise become a crash inside a permission check, which fails the deploy for the wrong reason.
    const parents = (found.orgs ?? []).flatMap((org) => org.parentOrg ?? []).filter((org): org is OrgRef => !!org);
    return [...new Map(parents.map((org) => [org.id, org])).values()];
  }

  /**
   * The orgs of the user that key names, or null when the directory holds no such user.
   *
   * `users(where:)` rather than `user(where:)`: the unique lookup answers `null` for accounts the
   * list query returns in full — the two are gated differently in that service — and a user read as
   * missing is a user with no orgs, which refuses a deploy for the wrong reason.
   */
  private async userOrgs(where: Record<string, string>): Promise<OrgRef[] | null> {
    const found = await this.ask<UserOrgs>(ORGS_OF_USER, { where });
    const user = (found.users ?? [])[0];
    if (!user) return null;
    const throughRoles = (user.roles ?? []).map((role) => role.org).filter((org): org is OrgRef => !!org);
    return [...new Map([...(user.orgs ?? []), ...throughRoles].map((org) => [org.id, org])).values()];
  }

  /** The app-ID-to-org index, rebuilt at most every few minutes and shared by every caller. */
  private async owners(): Promise<Map<string, OrgRef>> {
    const held = this.index;
    if (held && Date.now() - held.at < INDEX_TTL_MS) return held.owners;
    const owners = await this.build();
    this.index = { at: Date.now(), owners };
    return owners;
  }

  private async build(): Promise<Map<string, OrgRef>> {
    const owners = new Map<string, OrgRef>();
    for (let page = 0; page < MAX_PAGES; page++) {
      const read = await this.ask<TagIndex>(TAG_INDEX, { first: PAGE, skip: page * PAGE });
      for (const [appId, org] of ownersIn(read)) owners.set(appId, org);
      if ((read.eventsTargets ?? []).length < PAGE) break;
    }
    return owners;
  }

  private endpoint(): string {
    return this.config.get<string>("GQL_SERVICE_URL")?.trim().replace(/\/+$/, "") ?? "";
  }

  private key(): string {
    return this.config.get<string>("GQL_SERVICE_API_KEY")?.trim() ?? "";
  }

  private async ask<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await this.post(query, variables);
    if (!response.ok) throw new Error(`${DIRECTORY} answered ${response.status}.`);
    const body = (await response.json()) as GqlBody<T>;
    const refused = said(body.errors);
    if (refused) throw new Error(`${DIRECTORY} refused the question: ${refused}`);
    if (!body.data) throw new Error(`${DIRECTORY} answered with no data.`);
    return body.data;
  }

  private async post(query: string, variables: Record<string, unknown>): Promise<Response> {
    try {
      return await fetch(this.endpoint(), {
        method: "POST",
        headers: { "content-type": "application/json", "X-API-Key": this.key() },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw unanswered(err, DIRECTORY, TIMEOUT_MS);
    }
  }
}
