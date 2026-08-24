import { DeployTargetInfo, commitMessage } from "@mediajel/assistant-core/deploy/targets";
import { WidgetSession } from "@mediajel/assistant-core/types";
import type { Identity } from "~/auth/cognito";
import InfoTip from "~/ui/components/InfoTip";
import Stamp from "~/ui/components/Stamp";
import { ReactNode } from "react";

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

export interface DeploySectionProps {
  session: WidgetSession;
  /** Who the commit will be attributed to — the signed-in account, not a typed-in name. */
  identity: Identity | null;
  targets: { domain: TargetState; appId: TargetState | null };
  selected: "domain" | "app-id";
  deployError: string;
  cdnState: "idle" | "waiting" | "live" | "gave-up";
  onSelectTarget(kind: "domain" | "app-id"): void;
  onOpenSettings(): void;
  onExit(): void;
}

/**
 * The choice is not "which file" — it is which pages this tag should run on. The file name is
 * the consequence of the answer, so it waits inside the disclosure with everything else a
 * person cannot act on.
 */
const TargetChoice = ({
  state,
  kind,
  advertiser,
  site,
  reason,
  selected,
  onSelect,
}: {
  state: TargetState;
  kind: "domain" | "app-id";
  advertiser: string;
  site: string;
  reason: string | null;
  selected: boolean;
  onSelect(): void;
}): ReactNode => {
  const existing = state.existing;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={String(selected) as "true" | "false"}
      className={`mj-target${selected ? " mj-target--on" : ""}`}
      onClick={onSelect}
    >
      <span className="mj-target-head">
        {kind === "domain" ? "Only this site" : "Everywhere this advertiser runs"}
        {reason ? <em className="mj-target-suggested">suggested</em> : null}
      </span>
      <small className="mj-target-where">
        {kind === "domain" ? site : advertiser}
        <InfoTip
          label={kind === "domain" ? "What “only this site” means" : "What “everywhere this advertiser runs” means"}
        >
          {kind === "domain"
            ? `Runs on ${site}, for every MediaJel tag loaded on it — and nowhere else.`
            : `Runs wherever ${advertiser}'s tag is installed, whatever the hostname.`}
          {reason ? ` Suggested here because ${reason}.` : ""} The file will be <code>{state.info.path}</code>.
        </InfoTip>
      </small>
      {existing === "checking" && <small className="mj-target-note">checking the repo…</small>}
      {existing && typeof existing === "object" && (
        <small className="mj-target-note mj-target-note--warn">A tag is already here — deploying replaces it</small>
      )}
    </button>
  );
};

export const DeploySection = (props: DeploySectionProps): ReactNode => {
  const { session, identity, targets, selected, deployError, cdnState } = props;
  const deploy = session.deploy;

  if (session.step === "done" && deploy) {
    return (
      <div className="mj-section-body">
        <p className="mj-lede">
          <Stamp label="Deployed" tone="platform" filled /> <strong>{deploy.path}</strong> is on master — live once the
          repo's build finishes (usually 2–5 minutes).
        </p>
        <ul className="mj-links">
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
              <span className="mj-fine">
                CDN: <code>{deploy.cdnUrl}</code>{" "}
                {cdnState === "live"
                  ? "— live ✓"
                  : cdnState === "gave-up"
                    ? "— still building after 10 min; check the repo's Actions"
                    : "— waiting for the build…"}
              </span>
            </li>
          ) : null}
        </ul>
        <div className="mj-section-footer">
          <button type="button" className="mj-btn mj-btn--ghost" onClick={props.onExit}>
            Exit assistant
          </button>
        </div>
      </div>
    );
  }

  const current = selected === "domain" ? targets.domain : (targets.appId ?? targets.domain);
  const update = !!current.existing && typeof current.existing === "object";
  const suggested = session.generation?.suggestedTarget;

  return (
    <div className="mj-section-body">
      <p className="mj-lede">Where should this tag live?</p>

      <div className="mj-target-grid" role="radiogroup" aria-label="Deploy target">
        <TargetChoice
          state={targets.domain}
          kind="domain"
          site={targets.domain.info.name}
          advertiser={targets.appId?.info.name ?? ""}
          reason={suggested?.kind === "domain" ? suggested.reason : null}
          selected={selected === "domain"}
          onSelect={() => props.onSelectTarget("domain")}
        />
        {targets.appId ? (
          <TargetChoice
            state={targets.appId}
            kind="app-id"
            site={targets.domain.info.name}
            advertiser={targets.appId.info.name}
            reason={suggested?.kind === "app-id" ? suggested.reason : null}
            selected={selected === "app-id"}
            onSelect={() => props.onSelectTarget("app-id")}
          />
        ) : null}
      </div>

      {current.existing !== null && typeof current.existing === "object" ? (
        <div className="mj-notice mj-notice--warn" role="note">
          <p>
            {current.info.path} already exists. Deploying replaces it (the commit reads “Update … tag”). Current file
            begins:
          </p>
          <pre className="mj-ev-detail">{current.existing.preview}</pre>
        </div>
      ) : null}

      <p className="mj-fine mj-commit-line">
        It will be committed by MediaJel as your work, {identity ? identity.name || identity.username : "you"}.
        <InfoTip label="The exact commit">
          <span className="mj-commit-exact">
            {commitMessage({
              update,
              kind: current.info.kind,
              name: current.info.name,
              actor: identity
                ? { name: identity.name || identity.username, email: identity.email }
                : { name: "you", email: "you@mediajel.com" },
            })}
          </span>
          <br />
          Committed as the Frictionless Tags Factory, straight to master — live after CI, with no review in between.
        </InfoTip>
      </p>

      {deployError && (
        <div className="mj-notice mj-notice--warn" role="alert">
          <p>{deployError}</p>
        </div>
      )}
    </div>
  );
};

export default DeploySection;
