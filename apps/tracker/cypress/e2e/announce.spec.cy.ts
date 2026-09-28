/* global describe, it, beforeEach, cy, expect, Cypress */
describe("The tag announces itself on the page", () => {
  // Served on :1234 by `bun run test`; the page loads the tag from the built dist/ served on :3000
  // (`bun run server/index.ts`) as ?appId=universal-tag-staging-test&environment=jane.
  const HARNESS = "http://localhost:1234/";
  const APP_ID = "universal-tag-staging-test";
  const SECOND_TAG = "http://localhost:3000/index.js?appId=second-tag&environment=jane&version=2";
  const TAG_EVENT = "mediajel:tag";

  interface Announcement {
    v: number;
    appId: string;
    environment: string;
    version: string;
    enable: boolean;
    src: string;
    state: string;
  }
  interface Registry {
    v: number;
    tags: Announcement[];
  }
  type Page = Cypress.AUTWindow & { MediaJel?: unknown; overrides?: unknown };

  const registryOf = (win: Cypress.AUTWindow): Registry => (win as Page).MediaJel as Registry;

  // Headless browsers can report Do Not Track by default, and the tag honors it: a visitor who has
  // not opted out has to say so on every signal the gate reads for the tag to get past it.
  const notOptedOut = (win: Cypress.AUTWindow): void => {
    Object.defineProperty(win.navigator, "doNotTrack", { value: "0", configurable: true });
    Object.defineProperty(win.navigator, "msDoNotTrack", { value: null, configurable: true });
    Object.defineProperty(win, "doNotTrack", { value: null, configurable: true });
    Object.defineProperty(win.navigator, "globalPrivacyControl", { value: false, configurable: true });
  };

  /** Records every state the page hears, in order — installed before the tag loads. */
  const listen = (win: Cypress.AUTWindow, states: string[]): void => {
    win.addEventListener(TAG_EVENT, (event) => {
      states.push((event as CustomEvent<Announcement>).detail.state);
    });
  };

  beforeEach(() => {
    // Stub the collector so tests never hit a real endpoint; we only care whether the tag sends.
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} }).as("track");
    // The tag may throw on cross-origin SDK quirks; don't let that fail the assertion.
    cy.on("uncaught:exception", () => false);
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("goes from installed to running, and the page reads the tag off window.MediaJel", () => {
    const states: string[] = [];
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        notOptedOut(win);
        listen(win, states);
      },
    });

    cy.window().its("MediaJel.tags.0.state", { timeout: 20000 }).should("eq", "running");
    cy.window().then((win) => {
      const registry = registryOf(win);
      expect(registry.v).to.eq(1);
      expect(registry.tags).to.have.length(1);
      const [tag] = registry.tags;
      expect(tag).to.include({
        v: 1,
        appId: APP_ID,
        environment: "jane",
        version: "1",
        state: "running",
        enable: true,
      });
      expect(tag.src).to.include(APP_ID);
      expect(Object.isFrozen(tag), "records are frozen").to.eq(true);
      expect(states).to.deep.equal(["installed", "running"]);
    });
  });

  it("announces opted-out under Global Privacy Control, and tracks nothing", () => {
    const states: string[] = [];
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "globalPrivacyControl", { value: true, configurable: true });
        listen(win, states);
      },
    });

    cy.window().its("MediaJel.tags.0.state", { timeout: 20000 }).should("eq", "opted-out");
    // Give an un-gated build the time it would take to fire its pageview.
    cy.wait(3000);
    cy.get("@track.all").should("have.length", 0);
    cy.getCookies().should((cookies) => {
      expect(
        cookies.filter((c) => c.name.startsWith("_sp_")),
        "no Snowplow cookies on opt-out",
      ).to.have.length(0);
    });
    cy.window().then((win) => {
      expect(registryOf(win).tags).to.have.length(1);
      expect(registryOf(win).tags[0]).to.include({ appId: APP_ID, state: "opted-out", enable: true });
      expect(states).to.deep.equal(["installed", "opted-out"]);
    });
  });

  it("announces disabled when window.overrides switches the tag off, and tracks nothing", () => {
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        notOptedOut(win);
        (win as Page).overrides = { [APP_ID]: { enable: "false" } };
      },
    });

    cy.window().its("MediaJel.tags.0.state", { timeout: 20000 }).should("eq", "disabled");
    cy.wait(3000);
    cy.get("@track.all").should("have.length", 0);
    cy.window().then((win) => {
      expect(registryOf(win).tags[0]).to.include({ appId: APP_ID, state: "disabled", enable: false });
    });
  });

  it("a second tag on the page joins the same registry, after the first", () => {
    cy.visit(HARNESS, { onBeforeLoad: notOptedOut });
    cy.window().its("MediaJel.tags.0.state", { timeout: 20000 }).should("eq", "running");

    let first: Registry;
    cy.window().then((win) => {
      first = registryOf(win);
      // Parcel's runtime keeps one module cache per page, under a `parcelRequire<hash>` global, and a
      // second copy of the same bundle finds its entry already there and never boots. Clearing that
      // global first makes the appended script a fresh instance of the tag, which is what a second
      // tag from a different build is on a page that carries two.
      Object.keys(win)
        .filter((key) => /^parcelRequire[0-9a-f]+$/.test(key))
        .forEach((key) => delete (win as unknown as Record<string, unknown>)[key]);
      const script = win.document.createElement("script");
      script.src = SECOND_TAG;
      win.document.body.appendChild(script);
    });

    cy.window().its("MediaJel.tags", { timeout: 20000 }).should("have.length", 2);
    cy.window().then((win) => {
      expect(registryOf(win), "the same registry object").to.equal(first);
      expect(registryOf(win).tags.map((tag) => tag.appId)).to.deep.equal([APP_ID, "second-tag"]);
      expect(registryOf(win).tags[1]).to.include({ environment: "jane", version: "2" });
      expect(registryOf(win).tags[1].src).to.include("second-tag");
    });
  });

  it("leaves a window.MediaJel of the page's own untouched, and still announces by event", () => {
    const states: string[] = [];
    const theirs = { theirs: true };
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        notOptedOut(win);
        (win as Page).MediaJel = theirs;
        listen(win, states);
      },
    });

    cy.wrap(states, { timeout: 20000 }).should("deep.equal", ["installed", "running"]);
    cy.window().then((win) => {
      expect((win as Page).MediaJel).to.equal(theirs);
      expect(theirs).to.deep.equal({ theirs: true });
    });
  });
});
