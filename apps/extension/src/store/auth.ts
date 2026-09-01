import { Storage } from "@plasmohq/storage";

import { AuthError, AuthSession, refresh } from "~/auth/cognito";
import { AUTH_KEY } from "~/store/keys";

/**
 * Where the signed-in account lives: `chrome.storage.local`, reachable only from the extension
 * and never from a page. The in-page widget kept its credential in the client's own
 * `localStorage`, which was always the least comfortable thing about it.
 *
 * Only the background reads this. The panel asks the background for a token and gets one, or
 * gets told to sign in — it never holds the refresh token, and neither does any page.
 */

/** Refresh this long before the ID token expires, so no call is ever spent discovering it. */
const REFRESH_MARGIN_MS = 2 * 60_000;

const area = new Storage({ area: "local" });

export const readSession = async (): Promise<AuthSession | null> => {
  const stored = await area.get<AuthSession>(AUTH_KEY);
  if (!stored?.idToken || !stored.refreshToken || !stored.identity?.username) return null;
  return stored;
};

export const writeSession = async (session: AuthSession): Promise<void> => {
  await area.set(AUTH_KEY, session);
};

export const clearSession = async (): Promise<void> => {
  await area.remove(AUTH_KEY);
};

/** In-flight refresh, so five parallel calls do not each spend a round trip. */
let refreshing: Promise<AuthSession> | null = null;

/**
 * A currently-valid ID token, refreshing first if the one we hold is close to expiring.
 * Throws when nobody is signed in, or when the refresh token itself has been rejected — both
 * of which mean the same thing to the operator: sign in again.
 */
export const currentIdToken = async (): Promise<string> => {
  const session = await readSession();
  if (!session) throw new AuthError("Sign in with your MediaJel account to use the assistant.", "signed-out");
  if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.idToken;

  refreshing ??= refresh(session)
    .then(async (next) => {
      await writeSession(next);
      return next;
    })
    .finally(() => {
      refreshing = null;
    });

  try {
    return (await refreshing).idToken;
  } catch {
    await clearSession();
    throw new AuthError("Your MediaJel session has expired. Sign in again.", "signed-out");
  }
};
