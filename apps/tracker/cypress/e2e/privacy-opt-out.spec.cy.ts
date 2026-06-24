describe("US privacy opt-out (GPC / DNT)", () => {
  // Served on :1234 by `bun run test` (start-server-and-test → public/index.test.html loads the tag).
  const HARNESS = "http://localhost:1234/";

  beforeEach(() => {
    // Stub the collector so tests never hit a real endpoint; we only care whether
    // the tag *attempts* to send.
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} }).as("track");
    // The tag may throw on cross-origin SDK quirks; don't let that fail the assertion.
    cy.on("uncaught:exception", () => false);
    // Start every test from clean storage so the opt-out assertions can't see leakage.
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  // Every opt-out signal the edge gate honors, with how to set it on the window before the tag loads.
  const OPT_OUT_SIGNALS: { name: string; stub: (win: Cypress.AUTWindow) => void }[] = [
    {
      name: "Global Privacy Control (navigator.globalPrivacyControl)",
      stub: (win) =>
        Object.defineProperty(win.navigator, "globalPrivacyControl", { value: true, configurable: true }),
    },
    {
      name: "Do Not Track (navigator.doNotTrack)",
      stub: (win) => Object.defineProperty(win.navigator, "doNotTrack", { value: "1", configurable: true }),
    },
    {
      name: "legacy IE/Edge Do Not Track (navigator.msDoNotTrack)",
      stub: (win) => Object.defineProperty(win.navigator, "msDoNotTrack", { value: "1", configurable: true }),
    },
    {
      name: "legacy Do Not Track (window.doNotTrack)",
      stub: (win) => Object.defineProperty(win, "doNotTrack", { value: "1", configurable: true }),
    },
  ];

  OPT_OUT_SIGNALS.forEach(({ name, stub }) => {
    it(`hard no-tracks when ${name} is set`, () => {
      cy.visit(HARNESS, { onBeforeLoad: stub });

      // Give the async tag time to load and (in an un-gated build) fire a pageview.
      cy.wait(3000);

      // Hard no-track: nothing sent to the collector...
      cy.get("@track.all").should("have.length", 0);

      // ...and no Snowplow cookies written.
      cy.getCookies().should((cookies) => {
        const sp = cookies.filter((c) => c.name.startsWith("_sp_"));
        expect(sp, "no Snowplow cookies on opt-out").to.have.length(0);
      });

      // ...and no Snowplow localStorage written (the tracker never initialized).
      cy.window().then((win) => {
        const spKeys = Object.keys(win.localStorage).filter(
          (k) => k.startsWith("_sp_") || k.toLowerCase().includes("snowplow"),
        );
        expect(spKeys, "no Snowplow localStorage keys on opt-out").to.have.length(0);
      });
    });
  });

  it("loads the tag normally when the visitor has not opted out", () => {
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        // Represent a genuine non-opted-out visitor. Headless test browsers can report a DNT
        // signal by default; with respectDoNotTrack on, that would (correctly) suppress the tag,
        // so the positive control must explicitly clear every opt-out signal the gate + SDK read.
        Object.defineProperty(win.navigator, "doNotTrack", { value: "0", configurable: true });
        Object.defineProperty(win.navigator, "msDoNotTrack", { value: null, configurable: true });
        Object.defineProperty(win, "doNotTrack", { value: null, configurable: true });
        Object.defineProperty(win.navigator, "globalPrivacyControl", { value: false, configurable: true });
      },
    });

    // Positive control: the tag fires at least one collector request (e.g. pageview).
    cy.wait("@track", { timeout: 20000 });
  });
});
