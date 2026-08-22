import { WidgetSettings, WidgetSettingsPatch, maskSecret } from "@mediajel/tracker-widget/session/settings";
import { VNode, useState } from "@mediajel/tracker-widget/vendor";

/**
 * The settings overlay — reachable from anywhere, leaves the step untouched. One credential:
 * the GitHub token, which deploys the tag AND is what MediaJel's assistant service accepts as
 * access (the model and its key live server-side). The actor feeds the deploy commit;
 * `remember` moves the record to localStorage with its warning stated in plain words.
 */

export interface SettingsOverlayProps {
  settings: WidgetSettings;
  appId: string;
  connection: { status: "idle" | "testing" | "ok" | "error"; message: string };
  onTestConnection(): void;
  onPatch(patch: WidgetSettingsPatch): void;
  onForget(): void;
  onClearDedup(): void;
  onClose(): void;
}

const Secret = ({
  label,
  value,
  placeholder,
  onInput,
}: {
  label: string;
  value: string;
  placeholder: string;
  onInput(next: string): void;
}): VNode => {
  const [reveal, setReveal] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <label class="mj-field">
      <span class="mj-field-label">{label}</span>
      <span class="mj-secret">
        <input
          class="mj-input mj-input--mono"
          type={reveal ? "text" : "password"}
          placeholder={placeholder}
          value={editing || reveal ? value : value ? maskSecret(value) : ""}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          onInput={(event) => onInput((event.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          class="mj-reveal"
          aria-pressed={String(reveal) as "true" | "false"}
          onClick={() => setReveal(!reveal)}
        >
          {reveal ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
};

export const SettingsOverlay = ({
  settings,
  appId,
  connection,
  onTestConnection,
  onPatch,
  onForget,
  onClearDedup,
  onClose,
}: SettingsOverlayProps): VNode => {
  const hasToken = settings.githubToken.trim().length > 0;
  return (
    <div class="mj-section-body mj-settings" aria-label="Assistant settings">
      <h3 class="mj-settings-title">Settings</h3>

      <fieldset class="mj-fieldset">
        <legend class="mj-field-label">Access &amp; deploy</legend>
        <Secret
          label="GitHub token"
          value={settings.githubToken}
          placeholder="fine-grained PAT · Contents: read & write on mediajel-frictionless-custom-tag"
          onInput={(githubToken) => onPatch({ githubToken })}
        />
        <p class="mj-fine">
          One token does both jobs: it commits the tag, and it is what MediaJel’s assistant service accepts as your
          access — no model provider or API key to enter.
        </p>

        <div class="mj-connection">
          <button
            type="button"
            class="mj-btn mj-btn--ghost"
            aria-disabled={!hasToken || connection.status === "testing" ? "true" : "false"}
            onClick={hasToken && connection.status !== "testing" ? onTestConnection : undefined}
          >
            {connection.status === "testing" ? "Checking…" : "Check access"}
          </button>
          {connection.status === "ok" && (
            <span class="mj-connection-ok" role="status">
              {connection.message}
            </span>
          )}
          {connection.status === "error" && (
            <span class="mj-connection-bad" role="alert">
              {connection.message}
            </span>
          )}
        </div>

        <div class="mj-two">
          <label class="mj-field">
            <span class="mj-field-label">Your name</span>
            <input
              class="mj-input"
              value={settings.actor.name}
              onInput={(event) => onPatch({ actor: { name: (event.target as HTMLInputElement).value } })}
            />
          </label>
          <label class="mj-field">
            <span class="mj-field-label">Your email</span>
            <input
              class="mj-input"
              value={settings.actor.email}
              onInput={(event) => onPatch({ actor: { email: (event.target as HTMLInputElement).value } })}
            />
          </label>
        </div>
        <p class="mj-fine">
          Deploys commit to master of the frictionless repo as “Created by: you” and go live after its CI.
        </p>

        <label class="mj-check">
          <input
            type="checkbox"
            checked={settings.acknowledgedDataSharing}
            onChange={(event) => onPatch({ acknowledgedDataSharing: (event.target as HTMLInputElement).checked })}
          />
          <span>
            I understand Generate sends the pinned events, the compressed timeline and this page’s context (masked) to
            MediaJel’s assistant service, which hands them to the model.
          </span>
        </label>
      </fieldset>

      <fieldset class="mj-fieldset">
        <legend class="mj-field-label">This device</legend>
        <label class="mj-check">
          <input
            type="checkbox"
            checked={settings.remember}
            onChange={(event) => onPatch({ remember: (event.target as HTMLInputElement).checked })}
          />
          <span>Remember on this device — the token moves to localStorage, readable by any script on this site.</span>
        </label>
        <div class="mj-settings-actions">
          <button type="button" class="mj-btn mj-btn--ghost" onClick={onClearDedup}>
            Clear tracker dedup state
          </button>
          <button type="button" class="mj-btn mj-btn--danger" onClick={onForget}>
            Forget token on this site
          </button>
        </div>
        {appId ? (
          <p class="mj-fine">Dedup clear removes localStorage “{appId}_*”, so repeated test orders fire again.</p>
        ) : null}
      </fieldset>

      <div class="mj-section-footer">
        <button type="button" class="mj-btn mj-btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default SettingsOverlay;
