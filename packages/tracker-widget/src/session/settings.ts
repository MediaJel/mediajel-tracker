import { guard } from "@mediajel/tracker-core/utils/guard";
import { TrackerWidgetProvider } from "@mediajel/tracker-widget/api";
import logger from "@mediajel/tracker-widget/log";
import { WIDGET_SETTINGS_KEY } from "@mediajel/tracker-widget/session/keys";

/**
 * Provider credentials, the GitHub token and who a deploy is attributed to.
 *
 * Kept apart from the session on purpose: the session is evidence and is always per-tab, while
 * these are the operator's own configuration and are the one thing they may choose to keep.
 */

export interface WidgetActor {
  name: string;
  email: string;
}

export interface WidgetSettings {
  provider: TrackerWidgetProvider;
  /** Provider-qualified where the provider expects it, e.g. "anthropic/claude-sonnet-5". */
  model: string;
  apiKey: string;
  /** Only for a self-hosted gateway or a proxy; empty means the provider's own endpoint. */
  baseURL?: string;
  githubToken: string;
  /** Name and email written into the deploy commit's author/committer trailer. */
  actor: WidgetActor;
  /**
   * "Remember on this device" — moves this record from sessionStorage to localStorage, i.e.
   * writes an API key and a GitHub token to disk. It is off by default and only ever turned on
   * by an explicit click; `forget()` erases both copies.
   */
  remember: boolean;
  /** The one-time "I understand what is sent to the model" acknowledgement. Gates Generate. */
  acknowledgedDataSharing: boolean;
}

/** `actor` merges one level deep so setting a name cannot silently drop an email. */
export type WidgetSettingsPatch = Partial<Omit<WidgetSettings, "actor">> & {
  actor?: Partial<WidgetActor>;
};

export const DEFAULT_SETTINGS: WidgetSettings = {
  provider: "gateway",
  model: "",
  apiKey: "",
  githubToken: "",
  actor: { name: "", email: "" },
  remember: false,
  acknowledgedDataSharing: false,
};

export interface SettingsStore {
  get(): WidgetSettings;
  update(patch: WidgetSettingsPatch): WidgetSettings;
  subscribe(listener: (settings: WidgetSettings) => void): () => void;
  /** Erase both storage areas and return to the defaults — `disable({ forget: true })`. */
  forget(): void;
}

const readFrom = (storage: Storage): Partial<WidgetSettings> | null => {
  try {
    const raw = storage.getItem(WIDGET_SETTINGS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<WidgetSettings>;
  } catch {
    // Unparseable, or a storage that throws on access. Defaults are always a safe answer here.
    return null;
  }
};

const PROVIDERS: readonly TrackerWidgetProvider[] = ["gateway", "openai", "anthropic", "google"];

/**
 * Drops unknown keys and anything of the wrong shape, then fills the gaps from the defaults.
 * Shape-checked per key: this record routes secrets between storage areas, so a corrupted
 * `remember: "yes"` must not read as truthy and send an API key to localStorage.
 */
const normalize = (value: Partial<WidgetSettings>): WidgetSettings => {
  const settings: WidgetSettings = { ...DEFAULT_SETTINGS, actor: { ...DEFAULT_SETTINGS.actor } };
  const raw = value as Record<string, unknown>;

  const takeString = (key: "model" | "apiKey" | "baseURL" | "githubToken"): void => {
    if (typeof raw[key] === "string") settings[key] = raw[key] as string;
  };

  if (PROVIDERS.includes(raw.provider as TrackerWidgetProvider)) {
    settings.provider = raw.provider as TrackerWidgetProvider;
  }
  takeString("model");
  takeString("apiKey");
  takeString("baseURL");
  takeString("githubToken");
  if (typeof raw.remember === "boolean") settings.remember = raw.remember;
  if (typeof raw.acknowledgedDataSharing === "boolean") {
    settings.acknowledgedDataSharing = raw.acknowledgedDataSharing;
  }

  const actor = raw.actor;
  if (actor && typeof actor === "object") {
    const candidate = actor as Partial<WidgetActor>;
    settings.actor = {
      name: typeof candidate.name === "string" ? candidate.name : "",
      email: typeof candidate.email === "string" ? candidate.email : "",
    };
  }

  return settings;
};

const write = (storage: Storage, settings: WidgetSettings): void => {
  try {
    storage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    // A refused write costs the operator a retype, nothing more — never an exception.
    logger.warn("Settings could not be stored:", err);
  }
};

const erase = (storage: Storage): void => {
  try {
    storage.removeItem(WIDGET_SETTINGS_KEY);
  } catch (err) {
    logger.warn("Settings could not be cleared:", err);
  }
};

/**
 * @param sessionArea where settings live by default — per tab, gone when it closes.
 * @param localArea   where they live once "Remember on this device" is on.
 */
export const createSettingsStore = (
  sessionArea: Storage = sessionStorage,
  localArea: Storage = localStorage,
): SettingsStore => {
  // localStorage first: its presence IS the record of a previous "remember", and it must beat
  // a tab record left behind from before the operator ticked the box.
  const stored = readFrom(localArea) ?? readFrom(sessionArea);
  let settings = normalize(stored ?? {});
  let listeners: ((settings: WidgetSettings) => void)[] = [];

  const areaFor = (value: WidgetSettings): Storage => (value.remember ? localArea : sessionArea);
  const otherArea = (value: WidgetSettings): Storage => (value.remember ? sessionArea : localArea);

  return {
    get: () => settings,

    update: (patch) => {
      const next = normalize({
        ...settings,
        ...patch,
        actor: { ...settings.actor, ...(patch.actor ?? {}) },
      });

      settings = next;
      // Written before the old area is cleared, so a refused write never loses the record.
      write(areaFor(next), next);
      erase(otherArea(next));

      for (const listener of listeners) guard(listener, "settings-subscriber")(next);
      return next;
    },

    subscribe: (listener) => {
      listeners = listeners.concat(listener);
      return () => {
        listeners = listeners.filter((candidate) => candidate !== listener);
      };
    },

    forget: () => {
      settings = normalize({});
      erase(sessionArea);
      erase(localArea);
      for (const listener of listeners) guard(listener, "settings-subscriber")(settings);
    },
  };
};

/**
 * A secret rendered for display: enough to recognise which key it is, never enough to use, and
 * a fixed-width middle so the mask does not leak the length either.
 */
export const maskSecret = (value: string): string => {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
};
