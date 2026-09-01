import { ReactNode } from "react";

import type { Identity } from "~/auth/cognito";
import { Settings, ThemeChoice } from "~/store/settings";

/**
 * Settings — reachable from anywhere, leaves the step untouched.
 *
 * There is no credential on this screen. That is the point of the whole rebuild: the account
 * is the account you already have, the deploy token lives in the service, and what is left is
 * three genuine preferences and two things it is occasionally useful to destroy.
 */

export interface SettingsOverlayProps {
  identity: Identity | null;
  settings: Settings;
  appId: string;
  access: { status: "idle" | "checking" | "ok" | "error"; message: string };
  tagUrl: string;
  onCheckAccess(): void;
  onPatch(patch: Partial<Settings>): void;
  onSignOut(): void;
  onClearDedup(): void;
  onInjectTag(url: string): void;
  onClearAllJobs(): void;
  onClose(): void;
}

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const SettingsOverlay = ({
  identity,
  settings,
  appId,
  access,
  tagUrl,
  onCheckAccess,
  onPatch,
  onSignOut,
  onClearDedup,
  onInjectTag,
  onClearAllJobs,
  onClose,
}: SettingsOverlayProps): ReactNode => (
  <div className="mj-section-body mj-settings" aria-label="Assistant settings">
    <h3 className="mj-settings-title">Settings</h3>

    <fieldset className="mj-fieldset">
      <legend className="mj-field-label">Account</legend>
      {identity ? (
        <dl className="mj-defs">
          <div className="mj-def">
            <dt>Name</dt>
            <dd className="mj-mono">{identity.name || identity.username}</dd>
          </div>
          {identity.email ? (
            <div className="mj-def">
              <dt>Email</dt>
              <dd className="mj-mono">{identity.email}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mj-fine">Nobody is signed in.</p>
      )}

      <div className="mj-connection">
        <button
          type="button"
          className="mj-btn mj-btn--ghost"
          aria-disabled={!identity || access.status === "checking" ? "true" : "false"}
          onClick={identity && access.status !== "checking" ? onCheckAccess : undefined}
        >
          {access.status === "checking" ? "Checking…" : "Check access"}
        </button>
        {access.status === "ok" && (
          <span className="mj-connection-ok" role="status">
            {access.message}
          </span>
        )}
        {access.status === "error" && (
          <span className="mj-connection-bad" role="alert">
            {access.message}
          </span>
        )}
      </div>

      <p className="mj-fine">
        Deploys commit to master of the frictionless repo as “Created by: you” and go live after its CI. MediaJel holds
        the deploy credential — there is no token for you to keep.
      </p>

      <label className="mj-check">
        <input
          type="checkbox"
          checked={settings.acknowledgedDataSharing}
          onChange={(event) => onPatch({ acknowledgedDataSharing: event.currentTarget.checked })}
        />
        <span>
          I understand Generate sends the pinned events, the compressed timeline and this page’s context (masked) to
          MediaJel’s assistant service, which hands them to the model.
        </span>
      </label>
    </fieldset>

    <fieldset className="mj-fieldset">
      <legend className="mj-field-label">Appearance</legend>
      <div className="mj-choices" role="radiogroup" aria-label="Theme">
        {THEMES.map((theme) => (
          <button
            key={theme.value}
            type="button"
            role="radio"
            aria-checked={settings.theme === theme.value}
            className="mj-choice"
            onClick={() => onPatch({ theme: theme.value })}
          >
            {theme.label}
          </button>
        ))}
      </div>
    </fieldset>

    <fieldset className="mj-fieldset">
      <legend className="mj-field-label">This page</legend>
      <p className="mj-fine">
        {appId
          ? `The MediaJel tag is on this page (appId ${appId}).`
          : "There is no MediaJel tag on this page. Load one to record and verify before the client installs it."}
      </p>
      <div className="mj-settings-actions">
        <button
          type="button"
          className="mj-btn mj-btn--ghost"
          aria-disabled={tagUrl ? "false" : "true"}
          onClick={tagUrl ? () => onInjectTag(tagUrl) : undefined}
        >
          Load the tag on this page
        </button>
        <button
          type="button"
          className="mj-btn mj-btn--ghost"
          aria-disabled={appId ? "false" : "true"}
          onClick={appId ? onClearDedup : undefined}
        >
          Clear tracker dedup state
        </button>
      </div>
      {appId ? (
        <p className="mj-fine">Dedup clear removes localStorage “{appId}_*”, so repeated test orders fire again.</p>
      ) : null}
    </fieldset>

    <fieldset className="mj-fieldset">
      <legend className="mj-field-label">This browser</legend>
      <div className="mj-settings-actions">
        <button type="button" className="mj-btn mj-btn--danger" onClick={onClearAllJobs}>
          Delete every saved job
        </button>
        <button type="button" className="mj-btn mj-btn--danger" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      <p className="mj-fine">
        Saved jobs hold recordings of the sites you worked on. Deleting them cannot be undone; signing out leaves them
        where they are.
      </p>
    </fieldset>

    <div className="mj-section-footer">
      <button type="button" className="mj-btn mj-btn--primary" onClick={onClose}>
        Done
      </button>
    </div>
  </div>
);

export default SettingsOverlay;
