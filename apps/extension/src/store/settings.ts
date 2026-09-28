import { Storage } from "@plasmohq/storage";

import { SETTINGS_KEY } from "~/store/keys";

/**
 * What the operator has chosen, as opposed to what they have recorded.
 *
 * Three fields, where the in-page widget had six. The GitHub token is gone (the service holds
 * the deploy credential), and so is the actor — the commit is attributed from the signed-in
 * Cognito identity, which is both more accurate and one less thing to type.
 */

export type ThemeChoice = "system" | "light" | "dark";

export interface Settings {
  theme: ThemeChoice;
  /** The operator has seen what Generate sends out of the browser. Asked once, kept. */
  acknowledgedDataSharing: boolean;
  /** Last tag URL used by "load the tag on this page", so the second site is one click. */
  lastInjectedTagUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  acknowledgedDataSharing: false,
  lastInjectedTagUrl: "",
};

const area = new Storage({ area: "local" });

const normalize = (value: Partial<Settings> | null | undefined): Settings => ({
  theme: value?.theme === "light" || value?.theme === "dark" ? value.theme : "system",
  acknowledgedDataSharing: value?.acknowledgedDataSharing === true,
  lastInjectedTagUrl: typeof value?.lastInjectedTagUrl === "string" ? value.lastInjectedTagUrl : "",
});

export const readSettings = async (): Promise<Settings> => normalize(await area.get<Partial<Settings>>(SETTINGS_KEY));

export const writeSettings = async (patch: Partial<Settings>): Promise<Settings> => {
  const next = normalize({ ...(await readSettings()), ...patch });
  await area.set(SETTINGS_KEY, next);
  return next;
};
