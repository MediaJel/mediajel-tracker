import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { QueryStringContext } from "@mediajel/tracker-core/types";
import { TrackerWidget } from "@mediajel/tracker-widget/api";
import { WIDGET_ACTIVE_KEY, WIDGET_SESSION_KEY, WIDGET_SETTINGS_KEY } from "@mediajel/tracker-widget/session/keys";
import { WIDGET_HOST_ID, createWidget } from "@mediajel/tracker-widget/widget";

import { makeSession, sleep } from "./helpers";

const TAG = { appId: "acme-dispensary", collector: "https://c.example" } as QueryStringContext;

let widget: TrackerWidget;

const hostElement = (): HTMLElement | null => document.getElementById(WIDGET_HOST_ID);
const shadow = (): ShadowRoot => {
  const root = hostElement()?.shadowRoot;
  if (!root) throw new Error("the widget is not mounted");
  return root;
};
const text = (selector: string): string => shadow().querySelector(selector)?.textContent ?? "";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  widget = createWidget(TAG);
});

afterEach(async () => {
  await widget.disable();
  localStorage.clear();
});

describe("enable", () => {
  test("mounts the host and marks the tab as running the assistant", async () => {
    await widget.enable();

    expect(hostElement()).not.toBeNull();
    expect(sessionStorage.getItem(WIDGET_ACTIVE_KEY)).toBe("1");
  });

  test("mounts exactly one host however many times it is called", async () => {
    await widget.enable();
    await widget.enable();
    await widget.enable({ open: false });

    expect(document.querySelectorAll(`#${WIDGET_HOST_ID}`)).toHaveLength(1);
  });

  test("renders the work order open, with its letterhead and five sections", async () => {
    await widget.enable();

    expect(text(".mj-doc-title")).toBe("Integration Work Order");
    expect(text(".mj-def-value")).toBe(location.hostname);
    expect(shadow().querySelectorAll(".mj-defs .mj-def-value")[1].textContent).toBe(TAG.appId);
    expect(text(".mj-def-value--job")).toBe("Transaction tag");

    const labels = Array.from(shadow().querySelectorAll(".mj-section-label")).map((node) => node.textContent);
    expect(labels).toEqual(["Record", "Evidence", "Code", "Verify", "Deploy"]);
    expect(Array.from(shadow().querySelectorAll(".mj-section-number")).map((node) => node.textContent)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
    ]);
  });

  test("mounts collapsed when asked, and the chip names the step", async () => {
    await widget.enable({ open: false });

    const chip = shadow().querySelector(".mj-chip");
    expect(chip).not.toBeNull();
    expect(shadow().querySelector(".mj-card")).toBeNull();
    expect(chip?.getAttribute("aria-label")).toContain("home");
  });

  test("opens 01 Record at home and dims every section the session has not reached", async () => {
    await widget.enable();

    const rows = Array.from(shadow().querySelectorAll(".mj-section-row"));
    expect(rows).toHaveLength(5);
    // 01 owns `home`: reached, expanded, and carrying the goal picker.
    expect(rows[0].getAttribute("data-reached")).toBe("true");
    expect(rows[0].getAttribute("aria-expanded")).toBe("true");
    expect(shadow().querySelectorAll(".mj-goals .mj-btn")).toHaveLength(2);
    // The other four are ahead of the work and dimmed.
    expect(rows.slice(1).every((row) => row.getAttribute("aria-disabled") === "true")).toBe(true);
    expect(rows.slice(1).every((row) => row.getAttribute("data-reached") === "false")).toBe(true);
  });

  test("carries prefilled settings into the store without touching what was not passed", async () => {
    await widget.enable({ githubToken: "ghp_1", actor: { name: "Dana", email: "dana@mediajel.com" } });
    await widget.enable({ githubToken: "ghp_2" });

    const stored = JSON.parse(sessionStorage.getItem(WIDGET_SETTINGS_KEY) as string);
    expect(stored.actor).toEqual({ name: "Dana", email: "dana@mediajel.com" });
    expect(stored.githubToken).toBe("ghp_2");
  });

  test("remember: true in the prefill puts the settings on the device, not in the tab", async () => {
    await widget.enable({ githubToken: "ghp_1", remember: true });

    expect(sessionStorage.getItem(WIDGET_SETTINGS_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(WIDGET_SETTINGS_KEY) as string).githubToken).toBe("ghp_1");
  });

  test("writes no settings at all when there is no prefill", async () => {
    await widget.enable();

    expect(sessionStorage.getItem(WIDGET_SETTINGS_KEY)).toBeNull();
    expect(localStorage.getItem(WIDGET_SETTINGS_KEY)).toBeNull();
  });
});

describe("resume", () => {
  test("re-enters the step the tab left off on, collapsed so it covers nothing", async () => {
    sessionStorage.setItem(WIDGET_SESSION_KEY, JSON.stringify(makeSession({ step: "review", goal: "signup" })));

    await widget.resume();

    const chip = shadow().querySelector(".mj-chip");
    expect(chip).not.toBeNull();
    expect(chip?.getAttribute("aria-label")).toContain("review");
    expect(chip?.getAttribute("aria-label")).toContain("Sign-up tag");
  });

  test("opening the chip shows the card at that step, with the reached sections live", async () => {
    sessionStorage.setItem(WIDGET_SESSION_KEY, JSON.stringify(makeSession({ step: "review" })));
    await widget.resume();

    (shadow().querySelector(".mj-chip") as HTMLElement).click();

    const rows = Array.from(shadow().querySelectorAll(".mj-section-row"));
    expect(rows.map((row) => row.getAttribute("data-reached"))).toEqual(["true", "true", "false", "false", "false"]);
  });

  test("starts a clean session when the tab has none", async () => {
    await widget.resume();

    expect(shadow().querySelector(".mj-chip")?.getAttribute("aria-label")).toContain("home");
  });
});

describe("collapse", () => {
  test("the header chevron swaps the card for the chip and back", async () => {
    await widget.enable();

    (shadow().querySelector('[aria-label="Collapse the work order"]') as HTMLElement).click();
    expect(shadow().querySelector(".mj-card")).toBeNull();
    expect(shadow().querySelector(".mj-chip")).not.toBeNull();

    (shadow().querySelector(".mj-chip") as HTMLElement).click();
    expect(shadow().querySelector(".mj-card")).not.toBeNull();
  });
});

describe("disable", () => {
  test("unmounts, clears the tab flag and throws the recording away", async () => {
    await widget.enable();
    await widget.disable();

    expect(hostElement()).toBeNull();
    expect(sessionStorage.getItem(WIDGET_ACTIVE_KEY)).toBeNull();
    expect(sessionStorage.getItem(WIDGET_SESSION_KEY)).toBeNull();
  });

  test("keeps the settings unless it is asked to forget them", async () => {
    await widget.enable({ githubToken: "ghp_1" });
    await widget.disable();

    expect(JSON.parse(sessionStorage.getItem(WIDGET_SETTINGS_KEY) as string).githubToken).toBe("ghp_1");
  });

  test("forget: true erases the settings from both storage areas", async () => {
    await widget.enable({ githubToken: "ghp_1", remember: true });
    await widget.disable({ forget: true });

    expect(sessionStorage.getItem(WIDGET_SETTINGS_KEY)).toBeNull();
    expect(localStorage.getItem(WIDGET_SETTINGS_KEY)).toBeNull();
  });

  test("does not resurrect the session through a pending write or a pagehide", async () => {
    await widget.enable();
    await widget.disable();

    window.dispatchEvent(new Event("pagehide"));
    await sleep(260);

    expect(sessionStorage.getItem(WIDGET_SESSION_KEY)).toBeNull();
  });

  test("is safe on a widget that was never enabled", async () => {
    const fresh = createWidget(TAG);
    await fresh.disable();

    expect(hostElement()).toBeNull();
  });

  test("can be enabled again afterwards, on a clean session", async () => {
    await widget.enable();
    await widget.disable();
    await widget.enable();

    expect(hostElement()).not.toBeNull();
    expect(shadow().querySelector(".mj-card")).not.toBeNull();
  });
});

describe("section accordion", () => {
  test("a reached row toggles its section; rows ahead of the work do nothing", async () => {
    await widget.enable();
    const rows = () => Array.from(shadow().querySelectorAll(".mj-section-row")) as HTMLButtonElement[];

    // 01 owns `home` and is open; clicking it collapses it (strict accordion: nothing open).
    expect(rows()[0].getAttribute("aria-expanded")).toBe("true");
    rows()[0].click();
    expect(rows()[0].getAttribute("aria-expanded")).toBe("false");
    expect(shadow().querySelector(".mj-goals")).toBeNull();

    // Click again: back open, controls back.
    rows()[0].click();
    expect(rows()[0].getAttribute("aria-expanded")).toBe("true");
    expect(shadow().querySelectorAll(".mj-goals .mj-btn")).toHaveLength(2);

    // 02 is ahead of the work: clicking changes nothing.
    rows()[1].click();
    expect(rows()[1].getAttribute("aria-expanded")).toBe("false");
    expect(rows()[0].getAttribute("aria-expanded")).toBe("true");
  });

  test("peeking a finished section shows its record, and a step change re-opens the active one", async () => {
    await widget.enable();
    const rows = () => Array.from(shadow().querySelectorAll(".mj-section-row")) as HTMLButtonElement[];
    const goalButtons = shadow().querySelectorAll(".mj-goals .mj-btn");
    (goalButtons[0] as HTMLButtonElement).click(); // start recording → step recording
    const stop = Array.from(shadow().querySelectorAll(".mj-btn")).find((b) =>
      b.textContent?.includes("Stop"),
    ) as HTMLButtonElement;
    stop.click(); // → review: 02 opens, 01 stamped

    expect(rows()[1].getAttribute("aria-expanded")).toBe("true");
    rows()[0].click(); // peek at 01
    expect(rows()[0].getAttribute("aria-expanded")).toBe("true");
    expect(rows()[1].getAttribute("aria-expanded")).toBe("false");
    expect(shadow().querySelector(".mj-goals")).toBeNull(); // the record, not the controls
    expect(shadow().querySelector(".mj-counts")?.textContent).toContain("events");
  });
});

describe("start over", () => {
  test("asks first, keeps working on cancel, and resets the job on confirm — settings survive", async () => {
    await widget.enable({ githubToken: "ghp_keep" });
    const q = (selector: string) => shadow().querySelector(selector) as HTMLElement | null;

    expect(q('[aria-label="Start over"]')).toBeNull(); // nothing to throw away at home
    (shadow().querySelectorAll(".mj-goals .mj-btn")[0] as HTMLButtonElement).click();
    (
      Array.from(shadow().querySelectorAll(".mj-btn")).find((b) => b.textContent?.includes("Stop")) as HTMLButtonElement
    ).click();
    expect(JSON.parse(sessionStorage.getItem(WIDGET_SESSION_KEY) as string).step).toBe("review");

    q('[aria-label="Start over"]')!.click();
    expect(q(".mj-confirm")).not.toBeNull();
    (
      Array.from(shadow().querySelectorAll(".mj-confirm .mj-btn")).find((b) =>
        b.textContent?.includes("Keep"),
      ) as HTMLButtonElement
    ).click();
    expect(q(".mj-confirm")).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(WIDGET_SESSION_KEY) as string).step).toBe("review");

    q('[aria-label="Start over"]')!.click();
    (
      Array.from(shadow().querySelectorAll(".mj-confirm .mj-btn")).find((b) =>
        b.textContent?.includes("Start over"),
      ) as HTMLButtonElement
    ).click();

    const session = JSON.parse(sessionStorage.getItem(WIDGET_SESSION_KEY) as string);
    expect(session.step).toBe("home");
    expect(session.timeline).toEqual([]);
    expect(shadow().querySelectorAll(".mj-goals .mj-btn")).toHaveLength(2);
    expect(JSON.parse(sessionStorage.getItem(WIDGET_SETTINGS_KEY) as string).githubToken).toBe("ghp_keep");
  });
});
