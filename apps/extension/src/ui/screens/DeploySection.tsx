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
const Receipt = ({
  session,
  cdnState,
  onExit,
}: Pick<DeploySectionProps, "session" | "cdnState" | "onExit">): ReactNode => {
  const deploy = session.deploy!;
  return (
    <SectionBody>
      <Lede>
        <Stamp label="Deployed" tone="platform" filled /> <strong>{deploy.path}</strong> is on master — live once the
        repo's build finishes (usually 2–5 minutes).
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
      <SectionFooter>
        <Button type="button" variant="outline" onClick={onExit}>
          Exit assistant
        </Button>
      </SectionFooter>
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
const TargetChoice = ({
  state,
  kind,
  advertiser,
  site,
  reason,
}: {
  state: TargetState;
  kind: Kind;
  advertiser: string;
  site: string;
  reason: string | null;
}): ReactNode => {
  const words = TARGETS[kind];
  return (
    <div className="group flex items-start rounded-sm bg-stock transition-colors duration-150 ease-out has-data-checked:bg-sheet has-data-checked:shadow-[var(--mj-press),0_1px_3px_rgb(26_23_19/10%)] hover:bg-carbon has-data-checked:hover:bg-sheet">
      <RadioGroupItem value={kind} className="flex-auto px-3.5 py-[13px]">
        <span className="flex flex-wrap items-center gap-1.5 font-display text-xl font-semibold text-muted-foreground group-has-data-checked:text-foreground">
          {words.head}
          {reason ? <em className="ml-2 font-sans text-sm font-semibold text-primary not-italic">suggested</em> : null}
        </span>
        <span className="text-md leading-[1.45] text-muted-foreground wrap-anywhere">
          {kind === "domain" ? site : advertiser}
        </span>
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
  "session" | "identity" | "targets" | "selected" | "deployError" | "onSelectTarget"
>;

/** The assistant's reason for suggesting this target, when it suggested this one. */
const reasonFor = (session: WidgetSession, kind: Kind): string | null => {
  const suggested = session.generation?.suggestedTarget;
  return suggested?.kind === kind ? suggested.reason : null;
};

/** The two cards, or one when the tag has no advertiser file to offer. */
const Targets = ({ session, targets, selected, onSelectTarget }: Omit<ChoiceProps, "identity" | "deployError">) => (
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
      advertiser={targets.appId?.info.name ?? ""}
      reason={reasonFor(session, "domain")}
    />
    {targets.appId ? (
      <TargetChoice
        state={targets.appId}
        kind="app-id"
        site={targets.domain.info.name}
        advertiser={targets.appId.info.name}
        reason={reasonFor(session, "app-id")}
      />
    ) : null}
  </RadioGroup>
);

/** The target the choice currently names — the domain file until an advertiser file exists to choose. */
const currentTarget = (targets: DeploySectionProps["targets"], selected: Kind): TargetState =>
  selected === "domain" ? targets.domain : (targets.appId ?? targets.domain);

const Choice = (props: ChoiceProps): ReactNode => {
  const { identity, targets, selected, deployError } = props;
  const current = currentTarget(targets, selected);
  const update = Boolean(current.existing) && typeof current.existing === "object";

  return (
    <SectionBody>
      <Lede>Where should this tag live?</Lede>

      <Targets session={props.session} targets={targets} selected={selected} onSelectTarget={props.onSelectTarget} />

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

export const DeploySection = (props: DeploySectionProps): ReactNode =>
  props.session.step === "done" && props.session.deploy ? (
    <Receipt session={props.session} cdnState={props.cdnState} onExit={props.onExit} />
  ) : (
    <Choice {...props} />
  );

export default DeploySection;
