import { ReactNode, useEffect, useState } from "react";

import { ask } from "~/bridge/api";
import type { AuthChallenge, Identity } from "~/auth/cognito";
import { DEFAULT_SETTINGS, Settings } from "~/store/settings";
import SignIn from "~/ui/SignIn";
import { useTheme } from "~/ui/useTheme";

import "~/ui/globals.built.css";
import { Button } from "~/ui/components/ui/button";
import { Letterhead } from "~/ui/components/Letterhead";

/**
 * The toolbar popup: sign in, or open the panel.
 *
 * Chrome opens the side panel from the toolbar icon by itself, so this exists for the one
 * thing the panel cannot do for a first-time user — get them signed in before there is
 * anything to show — and to answer "am I signed in?" without opening anything.
 */

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** The popup's one surface: the sheet, 320px wide, padded like a plain panel. */
const POPUP = "flex w-80 flex-col gap-3 bg-sheet p-5";

export const Popup = (): ReactNode => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useTheme(settings.theme);

  useEffect(() => {
    void (async () => {
      try {
        const [state, stored] = await Promise.all([ask({ type: "auth/session" }), ask({ type: "settings/read" })]);
        setIdentity(state.identity);
        setSettings(stored);
      } catch (err) {
        setError(message(err));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const attempt = (work: () => Promise<{ identity: Identity | null; challenge: AuthChallenge | null }>): void => {
    void (async () => {
      setBusy(true);
      setError("");
      try {
        const state = await work();
        setChallenge(state.challenge);
        setIdentity(state.identity);
      } catch (err) {
        setError(message(err));
      } finally {
        setBusy(false);
      }
    })();
  };

  const openPanel = (): void => {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId !== undefined) await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    })();
  };

  if (!ready) return <div className={POPUP} />;

  if (!identity) {
    return (
      <div className={POPUP}>
        <SignIn
          challenge={challenge}
          busy={busy}
          error={error}
          onSignIn={(username, password) => attempt(() => ask({ type: "auth/sign-in", username, password }))}
          onAnswer={(kind, answer) => attempt(() => ask({ type: "auth/answer", kind, answer }))}
        />
      </div>
    );
  }

  return (
    <div className={POPUP}>
      <Letterhead title="Integrations Assistant" />

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-base">
        <dt className="text-muted-foreground">Signed in</dt>
        <dd className="m-0">{identity.name || identity.username}</dd>
      </dl>

      <Button type="button" className="w-full" onClick={openPanel}>
        Open the assistant
      </Button>
      <p className="mj-fine">
        It opens beside the page you are on. Whatever you record, generate and deploy belongs to that site.
      </p>
    </div>
  );
};

export default Popup;
