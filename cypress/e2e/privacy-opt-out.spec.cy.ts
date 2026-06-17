describe("US privacy opt-out (GPC / DNT)", () => {
  // Served by `npm run bootstrap-test-server` (public/index.test.html loads the tag).
  const HARNESS = "http://localhost:1234/";

  beforeEach(() => {
    // Stub the collector so tests never hit a real endpoint; we only care whether
    // the tag *attempts* to send.
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} }).as("track");
    // The tag may throw on cross-origin SDK quirks; don't let that fail the assertion.
    cy.on("uncaught:exception", () => false);
  });

  it("suppresses the tag when Global Privacy Control is enabled", () => {
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "globalPrivacyControl", {
          value: true,
          configurable: true,
        });
      },
    });

    // Give the async tag time to load and (in the un-gated build) fire a pageview.
    cy.wait(3000);

    // With the gate in place, nothing should have been sent to the collector.
    cy.get("@track.all").should("have.length", 0);
  });

  it("suppresses the tag when Do Not Track is enabled", () => {
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "doNotTrack", {
          value: "1",
          configurable: true,
        });
      },
    });

    cy.wait(3000);

    cy.get("@track.all").should("have.length", 0);
  });

  it("loads the tag normally when no opt-out signal is present", () => {
    cy.visit(HARNESS);

    // Positive control: the tag fires at least one collector request (e.g. pageview).
    cy.wait("@track", { timeout: 20000 });
  });
});
