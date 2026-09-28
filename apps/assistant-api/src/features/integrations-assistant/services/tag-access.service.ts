import { Inject, Injectable } from "@nestjs/common";

import { TAG_ACCESS_SOURCE, type OrgRef, type TagAccessSource } from "../providers/tag-access.source";
import type { Authorized } from "../types/assistant.types";

/**
 * May this account deploy this tag?
 *
 * The rule: the tag's app id belongs to one org, and the caller must be a member of that org or of
 * any org above it. A partner above an advertiser may work on the advertiser's tag; an account with
 * no relation to either may not, however valid its session.
 *
 * Every answer that is not a clear yes is a no. The service refuses when the directory is
 * unreachable, when the key is rejected, and when no org claims the app id — a deploy goes to
 * `master` unreviewed and is live minutes later, so an unanswered permission question cannot be
 * treated as permission. The sentence in `reason` is what the operator reads, so it says which of
 * those happened.
 *
 * Answers are kept for five minutes per account and app id, the way activity answers are: a job
 * asks once when Tracking setup opens and again when it deploys, and neither should wait on the
 * directory twice.
 */

export interface AccessDecision {
  allowed: boolean;
  /** Why it was refused, in a sentence the operator can act on. Empty when allowed. */
  reason: string;
  /** The org the directory named as the tag's owner, when it named one. */
  org?: OrgRef;
}

/** How far above the owning org to look. Deep enough for any real partner tree, bounded for a cyclic one. */
const MAX_LEVELS = 8;

const TTL_MS = 5 * 60_000;

const allow = (org: OrgRef): AccessDecision => ({ allowed: true, reason: "", org });
const refuse = (reason: string, org?: OrgRef): AccessDecision => ({ allowed: false, reason, ...(org ? { org } : {}) });

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Adds an org to the walk's visited set and yields its id, so the loop below needs no second statement. */
const remember = (seen: Set<string>, org: OrgRef): string => {
  seen.add(org.id);
  return org.id;
};

@Injectable()
export class TagAccessService {
  private readonly answers = new Map<string, { at: number; decision: AccessDecision }>();

  constructor(@Inject(TAG_ACCESS_SOURCE) private readonly source: TagAccessSource) {}

  /** Whether this service can check at all — reported by /health beside the other configuration. */
  configured(): boolean {
    return this.source.configured();
  }

  async mayDeploy(appId: string, who: Authorized): Promise<AccessDecision> {
    const key = `${who.sub}\u0000${appId}`;
    const held = this.answers.get(key);
    if (held && Date.now() - held.at < TTL_MS) return held.decision;
    const decision = await this.decide(appId, who);
    this.answers.set(key, { at: Date.now(), decision });
    return decision;
  }

  /** Nothing here throws: a question that could not be answered comes back as a refusal that says so. */
  private async decide(appId: string, who: Authorized): Promise<AccessDecision> {
    if (!this.source.configured()) {
      return refuse(
        "This service cannot check who owns this tag, so it will not deploy it. A MediaJel engineer needs to configure the directory it asks.",
      );
    }
    try {
      return await this.check(appId, who);
    } catch (err) {
      return refuse(`${message(err)} Until it answers, this tag cannot be deployed from here.`);
    }
  }

  private async check(appId: string, who: Authorized): Promise<AccessDecision> {
    const owner = await this.source.ownerOfTag(appId);
    if (!owner) {
      return refuse(
        `No MediaJel org has ${appId} in its tag configuration, so this service cannot tell whose tag it is.`,
      );
    }
    const mine = await this.source.orgsOfUser(who);
    return this.verdict(owner, new Set(mine.map((org) => org.id)));
  }

  private async verdict(owner: OrgRef, mine: ReadonlySet<string>): Promise<AccessDecision> {
    if (mine.size === 0) {
      return refuse(
        `Your MediaJel account is not a member of any org, so it cannot deploy ${owner.name}'s tag.`,
        owner,
      );
    }
    if (mine.has(owner.id) || (await this.aboveIncludes(owner, mine))) return allow(owner);
    return refuse(
      `This tag belongs to ${owner.name}. Your MediaJel account is not in that org, or in any org above it.`,
      owner,
    );
  }

  /** Walks up from the owning org one level at a time: a parent is a list, so this is a graph, not a chain. */
  private async aboveIncludes(owner: OrgRef, mine: ReadonlySet<string>): Promise<boolean> {
    const seen = new Set<string>([owner.id]);
    let level: readonly string[] = [owner.id];
    for (let depth = 0; depth < MAX_LEVELS && level.length > 0; depth++) {
      const parents = await this.source.parentsOf(level);
      const fresh = parents.filter((org) => !seen.has(org.id));
      if (fresh.some((org) => mine.has(org.id))) return true;
      level = fresh.map((org) => remember(seen, org));
    }
    return false;
  }
}
