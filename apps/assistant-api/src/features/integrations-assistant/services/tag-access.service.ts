import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { TAG_ACCESS_SOURCE, type Freshness, type OrgRef, type TagAccessSource } from "../providers/tag-access.source";
import type { Authorized } from "../types/assistant.types";

/**
 * May this account work on this tag — deploy it, edit its configuration, read its file or what it
 * recorded?
 *
 * The rule: the tag's app id belongs to the org that claims it, and the caller must be a member of
 * that org or of any org above it. A partner above an advertiser may work on the advertiser's tag;
 * an account with no relation to either may not, however valid its session. Usually one org claims
 * an app id. When several do — a target shared between orgs, or a second record naming the same app
 * id — the caller has to reach every one of them, so a record made in one's own org can never claim
 * somebody else's tag.
 *
 * Every answer that is not a clear yes is a no. The service refuses when the directory is
 * unreachable, when the key is rejected, and when no org claims the app id — a deploy goes to
 * `master` unreviewed and is live minutes later, so an unanswered permission question cannot be
 * treated as permission. The sentence in `reason` is what the operator reads, so it says which of
 * those happened.
 *
 * Definite answers are kept for five minutes per account and app id, for the reads: the panel asks
 * when Tracking setup opens and reads activity every time it does. The two deploys ask `fresh`, past
 * this cache and past the source's index, so an account removed from an org — or a tag moved out of
 * one — stops deploying at once. An answer that is a failure to ask is never kept; the next request
 * asks again.
 *
 * Every decision this service makes, rather than recalls, is written to the log with the account,
 * the app id and the part of the rule that decided it.
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

/**
 * MediaJel's own orgs, by id, from INTEGRATIONS_ASSISTANT_STAFF_ORG_IDS (commas or spaces between).
 *
 * Not by name. A name is something an org's own admins can type, so "MediaJel Partners LLC" would
 * pass any test that reads one; and nothing in the directory marks an org as MediaJel's — `level` is
 * a pricing tier that clients share. The list is configuration only MediaJel writes. Unset, nobody
 * is staff, and tags on no record and domain files are refused to everyone until it is.
 */
const STAFF_ORG_IDS = "INTEGRATIONS_ASSISTANT_STAFF_ORG_IDS";

/** Which part of the rule decided, for the audit line — and whether the answer may be kept. */
type Rule = "owner" | "unplaced" | "staff" | "unanswered" | "unconfigured";

interface Verdict {
  rule: Rule;
  decision: AccessDecision;
}

/** What an audit line is about: one tag, or domain files as a whole. */
type Subject = { appId: string } | { domains: true };

/** Only an answer the directory gave is kept; a failure to ask is asked again next time. */
const KEPT: ReadonlySet<Rule> = new Set<Rule>(["owner", "unplaced", "staff"]);

const allow = (org?: OrgRef): AccessDecision => ({ allowed: true, reason: "", ...(org ? { org } : {}) });
const refuse = (reason: string, org?: OrgRef): AccessDecision => ({ allowed: false, reason, ...(org ? { org } : {}) });

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Adds an org to the walk's visited set and yields its id, so the loop below needs no second statement. */
const remember = (seen: Set<string>, org: OrgRef): string => {
  seen.add(org.id);
  return org.id;
};

@Injectable()
export class TagAccessService {
  private readonly logger = new Logger(TagAccessService.name);
  private readonly answers = new Map<string, { at: number; decision: AccessDecision }>();

  constructor(
    @Inject(TAG_ACCESS_SOURCE) private readonly source: TagAccessSource,
    private readonly config: ConfigService,
  ) {}

  /** Whether this service can check at all — reported by /health beside the other configuration. */
  configured(): boolean {
    return this.source.configured();
  }

  /** May this account work on the tag with this app id? The deploys ask `fresh`; a read may take a kept answer. */
  mayDeploy(appId: string, who: Authorized, options: Freshness = {}): Promise<AccessDecision> {
    return this.answer(`tag\u0000${who.sub}\u0000${appId}`, options, who, { appId }, () =>
      this.ownerRule(appId, who, options),
    );
  }

  /**
   * May this account work on a domain file?
   *
   * A domain file runs on every page of its site, and nothing in the directory says whose site a
   * hostname is, so the owner rule has nothing to resolve. Until there is a record to place a
   * hostname by, only MediaJel's own staff may — reading one or writing one.
   */
  mayUseDomains(who: Authorized, options: Freshness = {}): Promise<AccessDecision> {
    return this.answer(`domains\u0000${who.sub}`, options, who, { domains: true }, () => this.staffRule(who));
  }

  private async answer(
    key: string,
    options: Freshness,
    who: Authorized,
    subject: Subject,
    decide: () => Promise<Verdict>,
  ): Promise<AccessDecision> {
    const held = options.fresh ? undefined : this.answers.get(key);
    if (held && Date.now() - held.at < TTL_MS) return held.decision;

    const verdict = await this.settle(decide);
    if (KEPT.has(verdict.rule)) this.answers.set(key, { at: Date.now(), decision: verdict.decision });
    this.audit(who, subject, verdict);
    return verdict.decision;
  }

  /** Nothing here throws: a question that could not be answered comes back as a refusal that says so. */
  private async settle(decide: () => Promise<Verdict>): Promise<Verdict> {
    if (!this.source.configured()) {
      return {
        rule: "unconfigured",
        decision: refuse(
          "This service cannot check who owns this tag, so it will not work on it. A MediaJel engineer needs to configure the directory it asks.",
        ),
      };
    }
    try {
      return await decide();
    } catch (err) {
      return {
        rule: "unanswered",
        decision: refuse(`${message(err)} Until it answers, this service will not work on this tag.`),
      };
    }
  }

  private async ownerRule(appId: string, who: Authorized, options: Freshness): Promise<Verdict> {
    const [owners, mine] = await Promise.all([this.source.ownersOfTag(appId, options), this.source.orgsOfUser(who)]);
    if (owners.length === 0) return { rule: "unplaced", decision: this.unplaced(appId, mine) };
    return { rule: "owner", decision: await this.verdict(appId, owners, new Set(mine.map((org) => org.id))) };
  }

  private async staffRule(who: Authorized): Promise<Verdict> {
    if (this.isStaff(await this.source.orgsOfUser(who))) return { rule: "staff", decision: allow() };
    return {
      rule: "staff",
      decision: refuse(
        "A domain file runs on every page of its site, and nothing in MediaJel's directory says whose site that is, so only MediaJel's own staff may work on one. Use the tag's app-id file instead.",
      ),
    };
  }

  /**
   * A tag the directory does not list.
   *
   * About one tag in ten is on no target record — an older one, or one made outside the dashboard —
   * and refusing every one of them would take the assistant away from the people who maintain
   * exactly those. So the question falls back to the one thing that is known: MediaJel's own staff
   * may work on a tag the directory cannot place, and nobody else may. It becomes the owner rule the
   * moment that tag gets a record.
   */
  private unplaced(appId: string, mine: readonly OrgRef[]): AccessDecision {
    if (this.isStaff(mine)) return allow();
    return refuse(
      `No MediaJel tag record carries ${appId}, so this service cannot tell whose tag it is. Only MediaJel's own staff may work on a tag it cannot place.`,
    );
  }

  /** Every claimant has to be within reach; the first that is not is the one the refusal names. */
  private async verdict(appId: string, owners: readonly OrgRef[], mine: ReadonlySet<string>): Promise<AccessDecision> {
    const first = owners[0];
    if (mine.size === 0) {
      return refuse(
        `Your MediaJel account is not a member of any org, so it cannot work on ${first.name}'s tag.`,
        first,
      );
    }
    for (const owner of owners) {
      if (mine.has(owner.id) || (await this.aboveIncludes(owner, mine))) continue;
      return refuse(
        owners.length === 1
          ? `This tag belongs to ${owner.name}. Your MediaJel account is not in that org, or in any org above it.`
          : `More than one org claims ${appId} (${owners.map((org) => org.name).join(", ")}). Your MediaJel account has to be in each of them or above each, and is not in ${owner.name} or any org above it.`,
        owner,
      );
    }
    return allow(first);
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

  private isStaff(mine: readonly OrgRef[]): boolean {
    const staff = new Set((this.config.get<string>(STAFF_ORG_IDS) ?? "").split(/[\s,]+/).filter(Boolean));
    return mine.some((org) => staff.has(org.id));
  }

  /** One line per decision made: who asked, about what, which rule answered, and what it said. */
  private audit(who: Authorized, subject: Subject, { rule, decision }: Verdict): void {
    this.logger.log(
      JSON.stringify({
        at: "tag-access",
        user: who.username,
        sub: who.sub,
        ...subject,
        rule,
        allowed: decision.allowed,
        ...(decision.org ? { org: decision.org.id } : {}),
        ...(decision.allowed ? {} : { reason: decision.reason }),
      }),
    );
  }
}
