import { TrackerWidgetProvider } from "@mediajel/tracker-widget/api";
import { WidgetSettings, WidgetSettingsPatch, maskSecret } from "@mediajel/tracker-widget/session/settings";
import { VNode, useState } from "@mediajel/tracker-widget/vendor";

/**
 * The settings overlay — reachable from anywhere, leaves the step untouched. Provider + model
 * + API key feed generation; the GitHub token + actor feed deploy; `remember` moves the record
 * to localStorage with its warning stated in plain words.
 */

export interface SettingsOverlayProps {
  settings: WidgetSettings;
  appId: string;
  onPatch(patch: WidgetSettingsPatch): void;
  onForget(): void;
  onClearDedup(): void;
  onClose(): void;
}

const PROVIDERS: { value: TrackerWidgetProvider; label: string; hint: string }[] = [
  { value: "gateway", label: "Vercel AI Gateway", hint: "one key, models as provider/model" },
  { value: "anthropic", label: "Anthropic", hint: "direct, key stays in this tab" },
  { value: "openai", label: "OpenAI", hint: "direct" },
  { value: "google", label: "Google", hint: "direct" },
];

const MODEL_SUGGESTIONS: Record<TrackerWidgetProvider, string[]> = {
  gateway: ["anthropic/claude-sonnet-5", "anthropic/claude-sonnet-4.6", "openai/gpt-5.5", "google/gemini-3.5-flash"],
  anthropic: ["claude-sonnet-5", "claude-sonnet-4-6"],
  openai: ["gpt-5.5", "gpt-5.4"],
  google: ["gemini-3.5-flash", "gemini-3.1-pro-preview"],
};

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
  onPatch,
  onForget,
  onClearDedup,
  onClose,
}: SettingsOverlayProps): VNode => (
  <div class="mj-section-body mj-settings" aria-label="Assistant settings">
    <h3 class="mj-settings-title">Settings</h3>

    <fieldset class="mj-fieldset">
      <legend class="mj-field-label">Model provider</legend>
      <div class="mj-provider-grid" role="radiogroup" aria-label="Model provider">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.value}
            type="button"
            role="radio"
            aria-checked={String(settings.provider === provider.value) as "true" | "false"}
            class={`mj-provider${settings.provider === provider.value ? " mj-provider--on" : ""}`}
            onClick={() => onPatch({ provider: provider.value })}
          >
            <span>{provider.label}</span>
            <small>{provider.hint}</small>
          </button>
        ))}
      </div>

      <label class="mj-field">
        <span class="mj-field-label">Model</span>
        <input
          class="mj-input mj-input--mono"
          list="mj-models"
          placeholder={MODEL_SUGGESTIONS[settings.provider][0]}
          value={settings.model}
          onInput={(event) => onPatch({ model: (event.target as HTMLInputElement).value })}
        />
        <datalist id="mj-models">
          {MODEL_SUGGESTIONS[settings.provider].map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
      </label>

      <Secret
        label="API key"
        value={settings.apiKey}
        placeholder="never leaves this tab unless you generate"
        onInput={(apiKey) => onPatch({ apiKey })}
      />

      <label class="mj-check">
        <input
          type="checkbox"
          checked={settings.acknowledgedDataSharing}
          onChange={(event) => onPatch({ acknowledgedDataSharing: (event.target as HTMLInputElement).checked })}
        />
        <span>
          I understand Generate sends the pinned events, the compressed timeline and this page's context to the provider
          above.
        </span>
      </label>
    </fieldset>

    <fieldset class="mj-fieldset">
      <legend class="mj-field-label">Deploy</legend>
      <Secret
        label="GitHub token"
        value={settings.githubToken}
        placeholder="fine-grained PAT · Contents: read & write on mediajel-frictionless-custom-tag"
        onInput={(githubToken) => onPatch({ githubToken })}
      />
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
    </fieldset>

    <fieldset class="mj-fieldset">
      <legend class="mj-field-label">This device</legend>
      <label class="mj-check">
        <input
          type="checkbox"
          checked={settings.remember}
          onChange={(event) => onPatch({ remember: (event.target as HTMLInputElement).checked })}
        />
        <span>Remember on this device — keys move to localStorage, readable by any script on this site.</span>
      </label>
      <div class="mj-settings-actions">
        <button type="button" class="mj-btn mj-btn--ghost" onClick={onClearDedup}>
          Clear tracker dedup state
        </button>
        <button type="button" class="mj-btn mj-btn--danger" onClick={onForget}>
          Forget keys on this site
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

export default SettingsOverlay;
