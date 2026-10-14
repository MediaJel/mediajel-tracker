/**
 * One copy of a script per page.
 *
 * A bridge or a relay can be injected into a page that already has one — the extension attaching
 * to tabs it was installed over, a dev rebuild, an update — and two copies would record every
 * event twice and wrap `fetch` twice. So a copy claims its place: it stands the previous claim of
 * the same wire version down (a copy of another version is left alone; its messages fail the
 * version check anyway) and registers how it can be stood down itself.
 */

interface Claim {
  v: number;
  dispose(): void;
}

const claimAs = (holder: object, key: string, version: number, dispose: () => void): void => {
  const claims = holder as Record<string, Claim | undefined>;
  const previous = claims[key];
  if (previous?.v === version) {
    try {
      previous.dispose();
    } catch {
      /* an older copy failing to stand down is not this copy's problem */
    }
  }
  claims[key] = { v: version, dispose };
};

/** The page bridge's claim, in the page's own world. */
export const claimBridge = (win: Window, version: number, dispose: () => void): void =>
  claimAs(win, "__mjAssistantBridge", version, dispose);

/** The relay's claim, in the extension's isolated world. */
export const claimRelay = (version: number, dispose: () => void): void =>
  claimAs(globalThis, "__mjAssistantRelay", version, dispose);
