import { DeployTargetInfo, commitMessage } from "@mediajel/assistant-core/deploy/targets";
import { WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode } from "react";

import type { Identity } from "~/auth/cognito";
import InfoTip from "~/ui/components/InfoTip";
import { Fine, Lede, Machine, SectionBody, SectionFooter } from "~/ui/components/Section";
import Stamp from "~/ui/components/Stamp";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { RadioGroup, RadioGroupItem } from "~/ui/components/ui/radio-group";

/**
 * Section 05 — Deploy, then the receipt. The choice is WHERE the tag runs: the domain file
 * runs on this exact hostname wherever any MediaJel tag loads; the app-id file runs wherever
 * THIS advertiser's tag is installed, whatever the hostname. The warning is plain: this
 * commit goes to master and is live after the repo's CI, with nobody in between.
 */

export interface TargetState {
  info: DeployTargetInfo;
  /** null = not checked yet; "checking"; "new"; or the existing file (widget keeps the sha). */
  existing: null | "checking" | "new" | { preview: string; sha: string };
}

type Kind = "domain" | "app-id";

export interface DeploySectionProps {
  session: WidgetSession;
  /** The advertiser's name, as the access check resolved it from the app ID; "" when unknown. */
  advertiser: string;
  /** The org that owns this tag, when this account may not deploy it; absent when it may. */
  refusedTo?: { name: string };
  /** Who the commit will be attributed to — the signed-in account, not a typed-in name. */
  identity: Identity | null;
  targets: { domain: TargetState; appId: TargetState | null };
  selected: Kind;
  deployError: string;
  cdnState: "idle" | "waiting" | "live" | "gave-up";
  onSelectTarget(kind: Kind): void;
  onOpenSettings(): void;
  onExit(): void;
}

const CDN_LABEL: Record<DeploySectionProps["cdnState"], string> = {
  idle: "— waiting for the build…",
  waiting: "— waiting for the build…",
  live: "— live ✓",
  "gave-up": "— still building after 10 min; check the repo's Actions",
};

/** The receipt: the file is on master, with the commit, the file and the CDN to look at. */
// One way out, not two: the pinned action starts the next job, and the letterhead's own name opens
// the jobs list. A second outline button beside them said neither which was which.
const Receipt = ({ session, cdnState }: Pick<DeploySectionProps, "session" | "cdnState">): ReactNode => {
  const deploy = session.deploy!;
  return (
    <SectionBody>
      {/* No stamp here: the step's own row carries it, and a stamp never shares a line with a
          sentence at this width. */}
      <Lede>
        <strong>{deploy.path}</strong> is on master — live once the repo's build finishes (usually 2–5 minutes).
      </Lede>
      <ul data-slot="links" className="m-0 mb-2.5 pl-[18px] text-sm [&_a]:text-primary">
        <li>
          <a href={deploy.commitUrl} target="_blank" rel="noreferrer">
            The commit
          </a>
        </li>
        {deploy.fileUrl ? (
          <li>
            <a href={deploy.fileUrl} target="_blank" rel="noreferrer">
              The file on GitHub
            </a>
          </li>
        ) : null}
        {deploy.cdnUrl ? (
          <li>
            <span className="text-xs text-muted-foreground">
              CDN: <code>{deploy.cdnUrl}</code> {CDN_LABEL[cdnState]}
            </span>
          </li>
        ) : null}
      </ul>
    </SectionBody>
  );
};

/** The two answers, in words: what each one means, and what its disclosure says. */
const TARGETS: Record<Kind, { head: string; tipLabel: string; explain(site: string, advertiser: string): string }> = {
  domain: {
    head: "Only this site",
    tipLabel: "What “only this site” means",
    explain: (site) => `Runs on ${site}, for every MediaJel tag loaded on it — and nowhere else.`,
  },
  "app-id": {
    head: "Everywhere this advertiser runs",
    tipLabel: "What “everywhere this advertiser runs” means",
    explain: (_site, advertiser) => `Runs wherever ${advertiser}'s tag is installed, whatever the hostname.`,
  },
};

/**
 * The mark that says which answer is chosen.
 *
 * The card's paper used to carry that alone: the chosen card measured 1.00:1 against the sheet it
 * sat on, and in dark it had no ground at all, so the unchosen card was the one that read as a
 * card. A choice may not be told by colour or by paper only — a tick and the identity rule down the
 * card's edge are the same fact printed twice, in ink that survives both themes.
 */
const Tick = (): ReactNode => (
  <svg
    viewBox="0 0 12 12"
    aria-hidden="true"
    className="hidden size-3 flex-none text-primary group-has-data-checked:block"
  >
    <path d="M1.5 6.5 4.5 9.5 10.5 2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
  </svg>
);

/** What the repo said about the file so far: nothing yet, checking, or that one is already there. */
const RepoNote = ({ existing }: { existing: TargetState["existing"] }): ReactNode => {
  if (existing === "checking") return <small className="text-sm text-ink-faint">checking the repo…</small>;
  if (existing && typeof existing === "object") {
    return <small className="text-sm text-warning-text">A tag is already here — deploying replaces it</small>;
  }
  return null;
};

/**
 * One answer to "where should this tag live?", printed on its own stock. The choice is not
 * "which file" — the file name is the consequence of the answer, so it waits inside the
 * disclosure, which sits beside the card's text rather than inside the button that chooses it.
 */
/**
 * The app ID, under the name it belongs to.
 *
 * The card promises "everywhere this advertiser runs" and used to answer with a UUID in the body
 * face, which is neither the advertiser nor machine text. The access check already resolves that
 * app ID to an org, so the name goes where a name belongs and the id stays underneath, in mono,
 * for whoever is matching it against a URL. With no name resolved, the id is still the answer and
 * this line would only say it twice.
 */
const AppIdLine = ({ kind, advertiser, appId }: { kind: Kind; advertiser: string; appId: string }): ReactNode =>
  kind === "app-id" && advertiser !== appId ? (
    <span className="font-mono text-xs leading-[1.45] wrap-anywhere text-ink-faint">{appId}</span>
  ) : null;

const TargetChoice = ({
  state,
  kind,
  advertiser,
  appId,
  site,
  reason,
}: {
  state: TargetState;
  kind: Kind;
  /** The advertiser's name when the directory gave one, else its app ID. */
  advertiser: string;
  /** The app ID itself, printed under the name as the machine fact. */
  appId: string;
  site: string;
  reason: string | null;
}): ReactNode => {
  const words = TARGETS[kind];
  return (
    <div className="group flex items-start rounded-sm border-l-2 border-transparent bg-stock transition-colors duration-150 ease-out has-data-checked:border-primary has-data-checked:bg-sheet has-data-checked:shadow-[var(--mj-press),0_1px_3px_rgb(26_23_19/10%)] hover:bg-carbon has-data-checked:hover:bg-sheet">
      <RadioGroupItem value={kind} className="flex-auto px-3.5 py-[13px]">
        <span className="flex flex-wrap items-center gap-1.5 font-display text-xl font-semibold text-muted-foreground group-has-data-checked:text-foreground">
          <Tick />
          {words.head}
          {reason ? <em className="ml-2 font-sans text-sm font-semibold text-primary not-italic">suggested</em> : null}
        </span>
        <span className="text-md leading-[1.45] text-muted-foreground wrap-anywhere">
          {kind === "domain" ? site : advertiser}
        </span>
        <AppIdLine kind={kind} advertiser={advertiser} appId={appId} />
        <RepoNote existing={state.existing} />
      </RadioGroupItem>
      <span className="mt-2.5 mr-2">
        <InfoTip label={words.tipLabel}>
          {words.explain(site, advertiser)}
          {reason ? ` Suggested here because ${reason}.` : ""} The file will be <code>{state.info.path}</code>.
        </InfoTip>
      </span>
    </div>
  );
};

/** Who the commit is attributed to: the signed-in account, or a placeholder before anyone is. */
const actorOf = (identity: Identity | null): { name: string; email: string } => {
  if (!identity) return { name: "you", email: "you@mediajel.com" };
  return { name: identity.name || identity.username, email: identity.email };
};

/** The commit, said as a sentence; the exact message is the machine's words, one click away. */
const CommitLine = ({
  identity,
  update,
  info,
}: {
  identity: Identity | null;
  update: boolean;
  info: DeployTargetInfo;
}) => {
  const actor = actorOf(identity);
  return (
    <Fine className="mt-4 flex flex-wrap items-center gap-[5px]">
      It will be committed by MediaJel as your work, {actor.name}.
      <InfoTip label="The exact commit">
        <span className="mb-2 block font-mono text-xs leading-[1.5] whitespace-pre-line text-foreground">
          {commitMessage({ update, kind: info.kind, name: info.name, actor })}
        </span>
        <br />
        Committed as the Frictionless Tags Factory, straight to master — live after CI, with no review in between.
      </InfoTip>
    </Fine>
  );
};

/** The file the deploy would overwrite, shown so the choice reads new-vs-update honestly. */
const ExistingFile = ({ current }: { current: TargetState }): ReactNode =>
  current.existing !== null && typeof current.existing === "object" ? (
    <Alert tone="warn" role="note" className="mb-3">
      <p>
        {current.info.path} already exists. Deploying replaces it (the commit reads “Update … tag”). Current file
        begins:
      </p>
      <Machine>{current.existing.preview}</Machine>
    </Alert>
  ) : null;

type ChoiceProps = Pick<
  DeploySectionProps,
  "session" | "identity" | "targets" | "selected" | "deployError" | "onSelectTarget" | "advertiser"
>;

/** The assistant's reason for suggesting this target, when it suggested this one. */
const reasonFor = (session: WidgetSession, kind: Kind): string | null => {
  const suggested = session.generation?.suggestedTarget;
  return suggested?.kind === kind ? suggested.reason : null;
};

/** The two cards, or one when the tag has no advertiser file to offer. */
const Targets = ({
  session,
  targets,
  selected,
  advertiser,
  onSelectTarget,
}: Omit<ChoiceProps, "identity" | "deployError">) => {
  // The app ID is the machine fact; the advertiser's name is what the access check resolved it to,
  // and the id stands in for the name until it does.
  const appId = targets.appId?.info.name ?? "";
  const named = advertiser || appId;
  return (
    <RadioGroup
      value={selected}
      onValueChange={(value) => onSelectTarget(value as Kind)}
      aria-label="Deploy target"
      className="mt-2.5 mb-3.5"
    >
      <TargetChoice
        state={targets.domain}
        kind="domain"
        site={targets.domain.info.name}
        advertiser={named}
        appId={appId}
        reason={reasonFor(session, "domain")}
      />
      {targets.appId ? (
        <TargetChoice
          state={targets.appId}
          kind="app-id"
          site={targets.domain.info.name}
          advertiser={named}
          appId={appId}
          reason={reasonFor(session, "app-id")}
        />
      ) : null}
    </RadioGroup>
  );
};

/** The target the choice currently names — the domain file until an advertiser file exists to choose. */
const currentTarget = (targets: DeploySectionProps["targets"], selected: Kind): TargetState =>
  selected === "domain" ? targets.domain : (targets.appId ?? targets.domain);

/**
 * What the step shows when the tag is not this account's to deploy.
 *
 * It takes the place of the choice rather than sitting above it: a live pair of targets, a
 * "suggested" badge and "It will be committed by MediaJel as your work" under a button that cannot
 * run are a promise the panel has already been told it cannot keep. The refusal itself is under the
 * button, where the press would be; what is left to say here is what to do about it.
 */
const Refused = ({ owner }: { owner: { name: string } }): ReactNode => (
  <SectionBody>
    <Lede>This tag is not yours to deploy.</Lede>
    <Fine className="mt-2">
      {owner.name
        ? `Ask someone in ${owner.name} to deploy it, or sign in with an account in that org.`
        : "Ask a MediaJel engineer which org owns this tag; the assistant could not find out."}
    </Fine>
  </SectionBody>
);

const Choice = (props: ChoiceProps): ReactNode => {
  const { identity, targets, selected, deployError } = props;
  const current = currentTarget(targets, selected);
  const update = Boolean(current.existing) && typeof current.existing === "object";

  return (
    <SectionBody>
      <Lede>Where should this tag live?</Lede>

      <Targets
        session={props.session}
        targets={targets}
        selected={selected}
        advertiser={props.advertiser}
        onSelectTarget={props.onSelectTarget}
      />

      <ExistingFile current={current} />
      <CommitLine identity={identity} update={update} info={current.info} />

      {deployError && (
        <Alert tone="warn" role="alert" className="mb-3">
          <p>{deployError}</p>
        </Alert>
      )}
    </SectionBody>
  );
};

/** The step is a receipt once the deploy has landed; until then it is the choice, or the refusal. */
const deployed = (session: WidgetSession): boolean => session.step === "done" && !!session.deploy;

export const DeploySection = (props: DeploySectionProps): ReactNode => {
  if (deployed(props.session)) {
    return <Receipt session={props.session} cdnState={props.cdnState} />;
  }
  if (props.refusedTo) return <Refused owner={props.refusedTo} />;
  return <Choice {...props} />;
};

export default DeploySection;
