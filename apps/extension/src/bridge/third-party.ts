import type { RegisterThirdPartyTagsInput, ThirdPartyTags } from "@mediajel/tracker-core/types";
import type {
  Outcome,
  ThirdPartyElement,
  ThirdPartyTrigger,
  ThirdPartyTriggerName,
} from "@mediajel/assistant-core/wire/types";
import { maskedUrl } from "@mediajel/assistant-core/wire/url";

import type { ThirdPartyFired } from "~/bridge/protocol";

/**
 * The third-party tags a page registers with the tag, and each one the tag fires — seen from
 * beside the tag, in the page's own realm.
 *
 * The tag assigns `window.registerThirdPartyTags` as its module runs and keeps what the page
 * registers in a module-local nothing else can read (`register-third-party-tags.ts` in
 * tracker-core). This runs first, at document_start, and puts an accessor on the property: the
 * tag's assignment goes through the setter, which keeps the tag's function and exposes a wrapper
 * that forwards every call and reports what was registered — how many tags per trigger and the
 * hosts they go to, never the templates, which can carry a client's own keys. Injected over a
 * live tab, the function already there is wrapped the same way. A property the page made
 * non-configurable is left alone: only the capture is lost, never the page's behaviour.
 *
 * A fire is an `<img>` or `<script>` the tag appends to `document.body` with its `src` already
 * set, so a childList observer on the body sees each one. The `src` is matched against the
 * registered templates with every `{macro}` allowed to be anything, and the element's own `load`
 * or `error` says how it ended — the page cannot tell a refusal from a block, only that it did
 * not load. Nothing here changes what the page or the tag does.
 */

/** What the bridge is told; the page bridge turns each into a message up. */
export interface ThirdPartyReport {
  registered(key: string, triggers: ThirdPartyTrigger[]): void;
  fired(key: string, fire: ThirdPartyFired): void;
  settled(key: string, outcome: Outcome): void;
}

/** The page's window, with the constructors this needs on it. */
type Win = Window & typeof globalThis;

const PROPERTY = "registerThirdPartyTags";

const TRIGGERS: ThirdPartyTriggerName[] = ["onTransaction", "onAddToCart", "onRemoveFromCart", "onSignup"];

/** The tag's own names for what it appends, and the nodes they arrive as. */
const ELEMENTS: Record<string, ThirdPartyElement> = { image: "image", script: "script" };
const NODES: Record<string, ThirdPartyElement> = { IMG: "image", SCRIPT: "script" };

const MACRO_RE = /\{\w+\}/g;

const LOADED: Outcome = { kind: "ok", status: 0, fromCache: false };
const NOT_LOADED: Outcome = { kind: "failed", status: 0 };

/** One registered template, ready to be matched. */
interface Template {
  trigger: ThirdPartyTriggerName;
  element: ThirdPartyElement;
  pattern: RegExp;
  host: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** A registration entry the tag would act on: a template, and a type it knows. */
const isTag = (value: unknown): value is ThirdPartyTags =>
  isRecord(value) && typeof value.tag === "string" && typeof value.type === "string" && value.type in ELEMENTS;

const tagsOf = (value: unknown): ThirdPartyTags[] => (Array.isArray(value) ? value.filter(isTag) : []);

const inputOf = (value: unknown): RegisterThirdPartyTagsInput => (isRecord(value) ? value : {});

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The template as a pattern: every `{macro}` may be anything but a `&` or a `#`. */
const patternOf = (template: string): RegExp => new RegExp(`^${template.split(MACRO_RE).map(escaped).join("[^&#]*")}$`);

const resolved = (url: string, base: string): string => {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
};

/** The host a template goes to, its macros stood in for; "" when it is not a URL. */
const hostOf = (template: string, base: string): string => {
  try {
    return new URL(template.replace(MACRO_RE, "x"), base).hostname;
  } catch {
    return "";
  }
};

const templatesOf = (input: RegisterThirdPartyTagsInput, base: string): Template[] =>
  TRIGGERS.flatMap((trigger) =>
    tagsOf(input[trigger]).map((tag) => ({
      trigger,
      element: ELEMENTS[tag.type],
      pattern: patternOf(tag.tag),
      host: hostOf(tag.tag, base),
    })),
  );

const unique = (values: string[]): string[] => [...new Set(values.filter((value) => value !== ""))];

/** What was registered, as the report says it: per trigger, how many and where to. */
const summaryOf = (templates: Template[]): ThirdPartyTrigger[] =>
  TRIGGERS.flatMap((trigger) => {
    const own = templates.filter((template) => template.trigger === trigger);
    return own.length === 0
      ? []
      : [{ trigger, count: own.length, hosts: unique(own.map((template) => template.host)) }];
  });

/** Whether the property can be taken over: absent, or a plain value the page left configurable. */
const takeable = (descriptor: PropertyDescriptor | undefined): boolean =>
  descriptor === undefined || (descriptor.configurable === true && "value" in descriptor);

/** The property as it was: the tag's own function, or nothing at all. */
const restore = (win: Win, held: unknown): void => {
  if (held === undefined) delete (win as unknown as Record<string, unknown>)[PROPERTY];
  else Object.defineProperty(win, PROPERTY, { configurable: true, enumerable: true, writable: true, value: held });
};

/**
 * Puts the accessor on the property. The tag's assignment goes through the setter, the page's
 * calls through the wrapper, and what the page sees behaves as the tag's function does — same
 * `this`, same arguments, same result. Returns the function that gives the property back.
 */
const captureRegistrations = (win: Win, onRegistered: (templates: Template[]) => void): (() => void) => {
  let held: unknown = Object.getOwnPropertyDescriptor(win, PROPERTY)?.value;
  function wrapped(this: unknown, ...args: unknown[]): unknown {
    const result = Reflect.apply(held as (...call: unknown[]) => unknown, this, args);
    onRegistered(templatesOf(inputOf(args[0]), win.document.baseURI));
    return result;
  }
  const get = (): unknown => (typeof held === "function" ? wrapped : held);
  const set = (value: unknown): void => {
    held = value;
  };
  Object.defineProperty(win, PROPERTY, { configurable: true, enumerable: true, get, set });
  return () => {
    // Only what this copy installed is this copy's to give back.
    if (Object.getOwnPropertyDescriptor(win, PROPERTY)?.get === get) restore(win, held);
  };
};

/** Watches the body for what the tag appends — from now, or from the moment the body exists. */
const observeBody = (win: Win, onAdded: (node: Node) => void): (() => void) => {
  const observer = new win.MutationObserver((records) =>
    records.forEach((record) => record.addedNodes.forEach(onAdded)),
  );
  const waiting = new win.MutationObserver(() => {
    if (!win.document.body) return;
    waiting.disconnect();
    observer.observe(win.document.body, { childList: true });
  });
  if (win.document.body) observer.observe(win.document.body, { childList: true });
  else waiting.observe(win.document, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    waiting.disconnect();
  };
};

interface Match {
  template: Template;
  src: string;
}

/** The registered template an appended node was made from, if any. */
const matchOf = (node: Node, templates: Template[]): Match | null => {
  const element = NODES[node.nodeName];
  const src = element === undefined ? null : (node as Element).getAttribute("src");
  if (src === null) return null;
  const template = templates.find((candidate) => candidate.element === element && candidate.pattern.test(src));
  return template ? { template, src } : null;
};

const fireOf = ({ template, src }: Match, base: string): ThirdPartyFired => ({
  trigger: template.trigger,
  element: template.element,
  host: hostOf(src, base),
  url: maskedUrl(resolved(src, base)),
});

const settleOn = (node: Node, key: string, report: ThirdPartyReport): void => {
  node.addEventListener("load", () => report.settled(key, LOADED), { once: true });
  node.addEventListener("error", () => report.settled(key, NOT_LOADED), { once: true });
};

/** Keys no other document's rows share: this copy's moment, then a count. */
const keys = (): (() => string) => {
  const prefix = `tp:${Date.now().toString(36)}`;
  let count = 0;
  return () => `${prefix}:${(count += 1)}`;
};

/** Starts watching; returns the function that stops and gives the property back. */
export const watchThirdPartyTags = (win: Win, report: ThirdPartyReport): (() => void) => {
  if (!takeable(Object.getOwnPropertyDescriptor(win, PROPERTY))) return () => undefined;
  const nextKey = keys();
  let templates: Template[] = [];
  const stopCapturing = captureRegistrations(win, (registered) => {
    templates = registered;
    report.registered(nextKey(), summaryOf(registered));
  });
  const stopObserving = observeBody(win, (node) => {
    const match = matchOf(node, templates);
    if (!match) return;
    const key = nextKey();
    report.fired(key, fireOf(match, win.document.baseURI));
    settleOn(node, key, report);
  });
  return () => {
    stopObserving();
    stopCapturing();
  };
};
