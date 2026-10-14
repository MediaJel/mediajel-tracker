import type { Authorized } from "../types/assistant.types";

/**
 * Who owns a tag, and which orgs a person belongs to — behind one seam.
 *
 * A deploy writes a file to `master` of the frictionless repo, which is live after that repo's CI
 * with nobody in between. Until now the only question asked of the caller was "is this a MediaJel
 * account", so any account could deploy for any advertiser. The answer this seam fetches is the
 * one the policy needs: the org that owns the tag, the orgs above it, and the orgs the caller is
 * in.
 *
 * It is a seam for the same reason the activity source is one: the transport does not survive the
 * move to amplication. Here it is `fetch` against gql-service with `X-API-Key`; there it can be
 * that repo's own client. Nothing above the token knows which.
 *
 * The key this reads is a machine credential that bypasses gql-service's user scoping
 * (`src/webapp/middleware/permissions/rules.ts` accepts it in place of a session), so it is read
 * server-side only. The browser is told `allowed` or a sentence, never anything it could replay.
 */

/** An org, as little of it as the policy needs. */
export interface OrgRef {
  id: string;
  name: string;
}

/** Whether an answer may come from what the source kept, or must be read from the directory as it is now. */
export interface Freshness {
  /** A deploy asks fresh: a tag that changed hands a minute ago must not still deploy for its old org. */
  fresh?: boolean;
}

export interface TagAccessSource {
  /** Whether the source can answer at all — asked by /health and before every check. */
  configured(): boolean;
  /** The orgs this MediaJel account belongs to; empty when the directory holds no such user. */
  orgsOfUser(who: Authorized): Promise<OrgRef[]>;
  /**
   * Every org a tag record names for this app id, deduplicated; empty when none does.
   *
   * All of them, not the first: a target can be shared by several orgs, and two targets can claim
   * one app id. Which one came first is the directory's ordering, not ownership, so the policy is
   * handed the whole list and decides on all of it.
   */
  ownersOfTag(appId: string, options?: Freshness): Promise<OrgRef[]>;
  /** The orgs directly above these ones, deduplicated — one level of the walk upward. */
  parentsOf(orgIds: readonly string[]): Promise<OrgRef[]>;
}

export const TAG_ACCESS_SOURCE = Symbol("TAG_ACCESS_SOURCE");
