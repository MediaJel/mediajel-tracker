import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Authorized } from "../types/assistant.types";
import { unanswered } from "./service-failure";
import type { OrgRef, TagAccessSource } from "./tag-access.source";

/**
 * gql-service over `fetch`, with the machine key it accepts in place of a session.
 *
 * Three questions, three queries, each one filterable in the schema as generated
 * (`src/generated/prisma.graphql` in mediajel-gql-service):
 *
 * - **The caller's orgs.** `User.cognitoUserId` and `User.username` are both unique, and the
 *   extension's Cognito ID token carries both `sub` and `cognito:username`. Which of the two the
 *   directory was filled with differs by how the account was made, so this asks by `cognitoUserId`
 *   and falls back to `username` rather than assuming one.
 * - **The tag's owner.** `OrgWhereInput.tagsConfig` accepts an `OrgTagsConfigWhereInput`, whose
 *   `appId` is a plain string filter. The other place an app id appears — `OrgDataConfig.appIds` —
 *   is a scalar list, and Prisma 1 generates no filter for those, so it cannot be asked about here.
 * - **The orgs above one.** `Org.parentOrg` is a list, so "the parent chain" is a graph: a level at
 *   a time, ids batched with `id_in`.
 *
 * Failures are plain `Error`s. The policy above turns every one of them into a refusal, because a
 * permission question that could not be answered is not a yes.
 */

const TIMEOUT_MS = 15_000;

/** What the operator calls it: gql-service is the directory of orgs, users and whose tag is whose. */
const DIRECTORY = "MediaJel's directory";

/** GraphQL answers a refused key with 200 and an `errors` array as readily as with a status. */
const said = (errors: unknown): string => {
  const list = Array.isArray(errors) ? errors : [];
  const messages = list
    .map((entry) => (entry as { message?: unknown })?.message)
    .filter((message): message is string => typeof message === "string");
  return messages.join("; ");
};

interface GqlBody<T> {
  data?: T;
  errors?: unknown;
}

const ORGS_OF_USER = `query AssistantUserOrgs($by: UserWhereUniqueInput!) {
  user(where: $by) { id orgs { id name } }
}`;

const OWNER_OF_TAG = `query AssistantTagOwner($appId: String!) {
  orgs(where: { tagsConfig: { appId: $appId } }, first: 2) { id name }
}`;

const PARENTS_OF = `query AssistantOrgParents($ids: [ID!]) {
  orgs(where: { id_in: $ids }) { id parentOrg { id name } }
}`;

type UserOrgs = { user: { orgs: OrgRef[] } | null };
type Owners = { orgs: OrgRef[] };
type Parents = { orgs: { id: string; parentOrg: OrgRef[] | null }[] };

@Injectable()
export class GqlTagAccessSource implements TagAccessSource {
  constructor(private readonly config: ConfigService) {}

  configured(): boolean {
    return !!(this.endpoint() && this.key());
  }

  async orgsOfUser(who: Authorized): Promise<OrgRef[]> {
    const byId = await this.userOrgs({ cognitoUserId: who.sub });
    return byId ?? (await this.userOrgs({ username: who.username })) ?? [];
  }

  /** The orgs of the user that unique key names, or null when the directory holds no such user. */
  private async userOrgs(by: Record<string, string>): Promise<OrgRef[] | null> {
    const found = await this.ask<UserOrgs>(ORGS_OF_USER, { by });
    return found.user ? (found.user.orgs ?? []) : null;
  }

  async ownerOfTag(appId: string): Promise<OrgRef | null> {
    const found = await this.ask<Owners>(OWNER_OF_TAG, { appId });
    return found.orgs?.[0] ?? null;
  }

  async parentsOf(orgIds: readonly string[]): Promise<OrgRef[]> {
    if (orgIds.length === 0) return [];
    const found = await this.ask<Parents>(PARENTS_OF, { ids: [...orgIds] });
    const parents = (found.orgs ?? []).flatMap((org) => org.parentOrg ?? []);
    return [...new Map(parents.map((org) => [org.id, org])).values()];
  }

  private endpoint(): string {
    return this.config.get<string>("GQL_SERVICE_URL")?.trim().replace(/\/+$/, "") ?? "";
  }

  private key(): string {
    return this.config.get<string>("GQL_SERVICE_API_KEY")?.trim() ?? "";
  }

  private async ask<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await this.post(query, variables);
    if (!response.ok) throw new Error(`MediaJel's directory answered ${response.status}.`);
    const body = (await response.json()) as GqlBody<T>;
    const refused = said(body.errors);
    if (refused) throw new Error(`MediaJel's directory refused the question: ${refused}`);
    if (!body.data) throw new Error("MediaJel's directory answered with no data.");
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
