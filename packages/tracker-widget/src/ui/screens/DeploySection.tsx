import { DeployTargetInfo } from "@mediajel/tracker-widget/deploy/deploy";
import { commitMessage } from "@mediajel/tracker-widget/deploy/deploy";
import { WidgetSettings } from "@mediajel/tracker-widget/session/settings";
import { WidgetSession } from "@mediajel/tracker-widget/types";
import Stamp from "@mediajel/tracker-widget/ui/components/Stamp";
import { VNode } from "@mediajel/tracker-widget/vendor";

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
  settings: WidgetSettings;
  targets: { domain: TargetState; appId: TargetState | null };
  selected: "domain" | "app-id";
  deploying: boolean;
  deployError: string;
  /** Why Deploy is unavailable ("" when it may run) — missing token/actor opens Settings. */
  deployBlocked: string;
  cdnState: "idle" | "waiting" | "live" | "gave-up";
  onSelectTarget(kind: "domain" | "app-id"): void;
  onDeploy(): void;
  onOpenSettings(): void;
  onStartAnother(): void;
  onExit(): void;
}

const TargetChoice = ({
  state,
  kind,
  reason,
  selected,
  onSelect,
}: {
  state: TargetState;
  kind: "domain" | "app-id";
  reason: string | null;
  selected: boolean;
  onSelect(): void;
}): VNode => (
  <button
    type="button"
    role="radio"
    aria-checked={String(selected) as "true" | "false"}
    class={`mj-provider${selected ? " mj-provider--on" : ""}`}
    onClick={onSelect}
  >
    <span>{kind === "domain" ? "Domain file" : "App-ID file"}</span>
    <small class="mj-target-path">{state.info.path}</small>
    <small>
      {kind === "domain"
        ? "runs on this hostname, for every MediaJel tag on it"
        : "runs wherever this advertiser's tag is installed"}
      {reason ? ` · suggested: ${reason}` : ""}
    </small>
    <small>
      {state.existing === "checking" && "checking the repo…"}
      {state.existing === "new" && "new file"}
      {state.existing && typeof state.existing === "object" && "⚠ file exists — deploying will UPDATE it"}
    </small>
  </button>
);

export const DeploySection = (props: DeploySectionProps): VNode => {
  const { session, settings, targets, selected, deploying, deployError, deployBlocked, cdnState } = props;
  const deploy = session.deploy;

  if (session.step === "done" && deploy) {
    return (
      <div class="mj-section-body">
        <p class="mj-lede">
          <Stamp label="Deployed" tone="platform" filled /> <strong>{deploy.path}</strong> is on master — live once the
          repo's build finishes (usually 2–5 minutes).
        </p>
        <ul class="mj-links">
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
              <span class="mj-fine">
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
        <div class="mj-section-footer">
          <button type="button" class="mj-btn mj-btn--ghost" onClick={props.onExit}>
            Exit assistant
          </button>
          <button type="button" class="mj-btn mj-btn--primary" onClick={props.onStartAnother}>
            Start another job
          </button>
        </div>
      </div>
    );
  }

  const current = selected === "domain" ? targets.domain : (targets.appId ?? targets.domain);
  const update = !!current.existing && typeof current.existing === "object";
  const suggested = session.generation?.suggestedTarget;

  return (
    <div class="mj-section-body">
      <p class="mj-lede">Where should this tag live?</p>

      <div class="mj-provider-grid" role="radiogroup" aria-label="Deploy target">
        <TargetChoice
          state={targets.domain}
          kind="domain"
          reason={suggested?.kind === "domain" ? suggested.reason : null}
          selected={selected === "domain"}
          onSelect={() => props.onSelectTarget("domain")}
        />
        {targets.appId ? (
          <TargetChoice
            state={targets.appId}
            kind="app-id"
            reason={suggested?.kind === "app-id" ? suggested.reason : null}
            selected={selected === "app-id"}
            onSelect={() => props.onSelectTarget("app-id")}
          />
        ) : null}
      </div>

      {current.existing !== null && typeof current.existing === "object" ? (
        <div class="mj-notice mj-notice--warn" role="note">
          <p>
            {current.info.path} already exists. Deploying replaces it (the commit reads “Update … tag”). Current file
            begins:
          </p>
          <pre class="mj-ev-detail">{current.existing.preview}</pre>
        </div>
      ) : null}

      <label class="mj-field">
        <span class="mj-field-label">Commit</span>
        <pre class="mj-ev-detail mj-commit-preview">
          {commitMessage({
            update,
            kind: current.info.kind,
            name: current.info.name,
            actor: settings.actor.name ? settings.actor : { name: "you", email: "you@mediajel.com" },
          })}
        </pre>
      </label>

      <div class="mj-notice mj-notice--privacy" role="note">
        <p>
          Deploy sends the tag file to GitHub with your token, committed as the Frictionless Tags Factory with your name
          in the body. It goes straight to master — live after CI, no review in between.
        </p>
      </div>

      {deployError && (
        <div class="mj-notice mj-notice--warn" role="alert">
          <p>{deployError}</p>
        </div>
      )}

      <div class="mj-section-footer">
        <button
          type="button"
          class="mj-btn mj-btn--primary"
          aria-disabled={deploying || current.existing === "checking" ? "true" : "false"}
          onClick={deploying ? undefined : deployBlocked ? props.onOpenSettings : props.onDeploy}
        >
          {deploying ? "Deploying…" : update ? "Update on master" : "Deploy to master"}
        </button>
      </div>
      {deployBlocked && <p class="mj-blocked-note">{deployBlocked} — the button opens Settings.</p>}
    </div>
  );
};

export default DeploySection;
