import { beforeEach, describe, expect, mock, test } from "bun:test";

import { BridgeDown } from "~/bridge/protocol";
import { handle } from "~/background/handle";
import { armTab, reportFromPage } from "~/background/simulation";
import { installSimulatedTag, serveEdits } from "~/bridge/simulate";
import { readSettings } from "~/store/settings";
import { clearExtensionStorage } from "./setup";

/** The assistant service's preview, as the background asks it: the block it would render, and its version. */
const previews: { appId: string; edits: Record<string, string> }[] = [];
// Every other export stays the real one, so no other test file that runs after this one is touched.
const client = await import("~/service/client");
mock.module("~/service/client", () => ({
  ...client,
  previewOverrides: async (_token: unknown, input: { appId: string; edits: Record<string, string> }) => {
    previews.push(input);
    return { block: `;/* block for ${input.appId} */`, version: "v-0000abcd", deployed: null };
  },
}));

/**
 * A simulated tag, kept per site: installed from its URL, armed again on every page of the site,
 * said on the toolbar, paused, removed — and, in the page, one script on the tag's own host.
 */

const TAB = 1;
const SITE = "shop.example.com";
const URL_ = "https://tags.cnna.io/?appId=5f976cbb-7d29-46ce-bf07-0f701478d800&version=2&s3.pv=Shop-PV";

const sent: BridgeDown[] = [];
const send = async (_tabId: number, message: BridgeDown): Promise<boolean> => {
  sent.push(message);
  return true;
};
const push = (): void => undefined;

interface ChromeSpies {
  reloaded: number[];
  badges: { tabId: number; text: string }[];
}
const spies: ChromeSpies = { reloaded: [], badges: [] };

beforeEach(() => {
  clearExtensionStorage();
  sent.length = 0;
  spies.reloaded.length = 0;
  spies.badges.length = 0;
  const chromeApi = (globalThis as unknown as { chrome: Record<string, Record<string, unknown>> }).chrome;
  chromeApi.tabs.reload = async (tabId: number) => void spies.reloaded.push(tabId);
  chromeApi.action.setBadgeText = async (details: { tabId: number; text: string }) => void spies.badges.push(details);
});

const ask = (request: Parameters<typeof handle>[0]): Promise<unknown> => handle(request, send, push);

describe("simulating a tag on a site", () => {
  test("keeps it for the site, remembers the URL, says SIM on the site's tabs, and reloads the tab", async () => {
    const view = (await ask({ type: "simulation/install", tabId: TAB, url: `  ${URL_}  ` })) as {
      simulation: unknown;
    };
    expect(view.simulation).toMatchObject({
      enabled: true,
      install: { appId: "5f976cbb-7d29-46ce-bf07-0f701478d800" },
    });
    expect((await readSettings()).lastInjectedTagUrl).toBe(URL_);
    expect(spies.badges).toEqual([{ tabId: TAB, text: "SIM" }]);
    expect(spies.reloaded).toEqual([TAB]);
  });

  test("refuses a URL that is not a MediaJel tag's, in words, and keeps nothing", async () => {
    await expect(
      ask({ type: "simulation/install", tabId: TAB, url: "https://widget.example.com/loader.js?appId=a" }),
    ).rejects.toThrow("That isn't a MediaJel tag URL: it is served from widget.example.com.");
    expect(await ask({ type: "simulation/list" })).toEqual([]);
  });

  test("arms every new page of the site with the tag, and none while it is paused", async () => {
    await ask({ type: "simulation/install", tabId: TAB, url: URL_ });
    await armTab(TAB, SITE, send);
    expect(sent).toEqual([{ type: "simulate", install: URL_, tried: {} }]);

    sent.length = 0;
    await ask({ type: "simulation/pause", tabId: TAB, enabled: false });
    await armTab(TAB, SITE, send);
    expect(sent).toEqual([]);
    expect(spies.badges.at(-1)).toEqual({ tabId: TAB, text: "" });
  });

  test("a page that refused the tag says so until its next document", async () => {
    await ask({ type: "simulation/install", tabId: TAB, url: URL_ });
    reportFromPage(TAB, { installFailed: true });
    expect(await ask({ type: "simulation/read", tabId: TAB })).toMatchObject({ page: { installFailed: true } });
    await armTab(TAB, SITE, send);
    expect(await ask({ type: "simulation/read", tabId: TAB })).toMatchObject({ page: null });
  });

  test("removed, it is gone from the site and from the list, and the tab it was removed from reloads", async () => {
    await ask({ type: "simulation/install", tabId: TAB, url: URL_ });
    expect(await ask({ type: "simulation/list" })).toHaveLength(1);
    spies.reloaded.length = 0;
    expect(await ask({ type: "simulation/remove", site: SITE, tabId: TAB })).toEqual([]);
    expect(await ask({ type: "simulation/read", tabId: TAB })).toEqual({ simulation: null, page: null });
    expect(spies.reloaded).toEqual([TAB]);
  });
});

describe("the simulated tag in the page", () => {
  const outcome = () => {
    const seen = { loaded: 0, failed: 0 };
    return { seen, callbacks: { loaded: () => void seen.loaded++, failed: () => void seen.failed++ } };
  };

  test("is one script on the tag's own URL, in the head, marked as simulated — and only one", () => {
    const doc = document.implementation.createHTMLDocument();
    const { callbacks } = outcome();
    installSimulatedTag(doc, URL_, callbacks);
    installSimulatedTag(doc, URL_, callbacks);
    const scripts = doc.head.querySelectorAll("script[data-mj-simulated]");
    expect(scripts).toHaveLength(1);
    expect((scripts[0] as HTMLScriptElement).src).toBe(URL_);
    expect((scripts[0] as HTMLScriptElement).async).toBe(true);
  });

  test("waits for the parser to make a head, since the tag writes its preloads there", async () => {
    const doc = document.implementation.createHTMLDocument();
    doc.head.remove();
    installSimulatedTag(doc, URL_, outcome().callbacks);
    expect(doc.querySelector("script[data-mj-simulated]")).toBeNull();
    doc.documentElement.prepend(doc.createElement("head"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(doc.head.querySelector("script[data-mj-simulated]")).not.toBeNull();
  });

  test("says when the page refused it", () => {
    const doc = document.implementation.createHTMLDocument();
    const { seen, callbacks } = outcome();
    installSimulatedTag(doc, URL_, callbacks);
    doc.querySelector("script[data-mj-simulated]")?.dispatchEvent(new Event("error"));
    expect(seen.failed).toBeGreaterThanOrEqual(1);
  });
});

describe("an edit tried on a site", () => {
  const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";

  test("is rendered by the service, kept for the site with its block and version, and armed on every page", async () => {
    previews.length = 0;
    const view = (await ask({ type: "simulation/try", tabId: TAB, appId: APP, edits: { "s3.pv": "Tried" } })) as {
      simulation: { tried: Record<string, unknown>; enabled: boolean };
    };
    expect(previews).toEqual([{ appId: APP, edits: { "s3.pv": "Tried" } }]);
    expect(view.simulation.tried[APP]).toEqual({
      edits: { "s3.pv": "Tried" },
      block: `;/* block for ${APP} */`,
      version: "v-0000abcd",
    });
    expect(spies.reloaded).toEqual([TAB]);
    expect(spies.badges.at(-1)).toEqual({ tabId: TAB, text: "SIM" });

    await armTab(TAB, SITE, send);
    expect(sent.at(-1)).toEqual({
      type: "simulate",
      install: null,
      tried: { [APP]: { block: `;/* block for ${APP} */`, version: "v-0000abcd" } },
    });
  });

  test("no edits stop trying it, and a site with nothing left to run has no simulation", async () => {
    await ask({ type: "simulation/try", tabId: TAB, appId: APP, edits: { "s3.pv": "Tried" } });
    await ask({ type: "simulation/try", tabId: TAB, appId: APP, edits: {} });
    expect(await ask({ type: "simulation/read", tabId: TAB })).toEqual({ simulation: null, page: null });
  });

  test("beside a simulated install, the install stays when the edit goes", async () => {
    await ask({ type: "simulation/install", tabId: TAB, url: URL_ });
    await ask({ type: "simulation/try", tabId: TAB, appId: APP, edits: { "s3.pv": "Tried" } });
    const view = (await ask({ type: "simulation/try", tabId: TAB, appId: APP, edits: {} })) as {
      simulation: { install: unknown; tried: Record<string, unknown> };
    };
    expect(view.simulation.install).not.toBeNull();
    expect(view.simulation.tried).toEqual({});
  });

  test("a page's report of tags that ran before the edits is kept beside what else it said", async () => {
    await ask({ type: "simulation/try", tabId: TAB, appId: APP, edits: { "s3.pv": "Tried" } });
    reportFromPage(TAB, { late: [APP] });
    reportFromPage(TAB, { installFailed: false });
    expect(await ask({ type: "simulation/read", tabId: TAB })).toMatchObject({
      page: { installFailed: false, late: [APP] },
    });
  });
});

describe("edits served in the page", () => {
  const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";
  const FILE_URL = `https://test-custom-tags.cnna.io/app-ids/${btoa(APP)}.js`;
  const TRIED = { [APP]: { block: ";/* the tried block */", version: "v-0000abcd" } };

  /** A page whose own fetch answers with a file, a 404, or a network failure, and says what it was asked. */
  const pageWith = (answer: () => Promise<Response>) => {
    const asked: string[] = [];
    const win = {
      location: { href: "https://terrabis.co/" },
      fetch: async (input: RequestInfo | URL) => {
        asked.push(String(input));
        return answer();
      },
      performance: { getEntriesByType: () => [] as { name: string }[] },
    } as unknown as Window & Record<string, unknown>;
    return { win, asked };
  };

  test("an edited tag's app-id file comes back with the block after its own code, and the versions are named", async () => {
    const { win } = pageWith(async () => new Response("window.overrides = { a: 1 };"));
    serveEdits(win, TRIED);
    const text = await (await win.fetch(FILE_URL)).text();
    expect(text).toBe("window.overrides = { a: 1 };\n;/* the tried block */\n");
    expect(win.__mediajelAssistantOverrides).toEqual({ [APP]: "v-0000abcd" });
  });

  test("a file that does not exist, or a request that fails, is served as the block alone", async () => {
    for (const answer of [
      async () => new Response("<Error>NoSuchKey</Error>", { status: 404 }),
      async () => {
        throw new TypeError("Failed to fetch");
      },
    ]) {
      const { win } = pageWith(answer);
      serveEdits(win, TRIED);
      expect(await (await win.fetch(FILE_URL)).text()).toBe("\n;/* the tried block */\n");
    }
  });

  test("every other request goes through as it came", async () => {
    const { win, asked } = pageWith(async () => new Response("theirs"));
    serveEdits(win, TRIED);
    expect(await (await win.fetch("https://terrabis.co/api/cart")).text()).toBe("theirs");
    expect(await (await win.fetch(`https://test-custom-tags.cnna.io/app-ids/${btoa("another-tag")}.js`)).text()).toBe(
      "theirs",
    );
    expect(asked).toHaveLength(2);
  });

  test("a tag that fetched its file before the edits arrived is named, and stopping gives the page its own fetch back", () => {
    const { win } = pageWith(async () => new Response(""));
    (win as unknown as { performance: unknown }).performance = { getEntriesByType: () => [{ name: FILE_URL }] };
    const own = win.fetch;
    const served = serveEdits(win, TRIED);
    expect(served.late).toEqual([APP]);
    served.stop();
    expect(win.fetch).toBe(own);
    expect(win.__mediajelAssistantOverrides).toBeUndefined();
  });
});
