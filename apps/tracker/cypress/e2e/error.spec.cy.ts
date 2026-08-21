import { appErrorsFrom } from "../support/app-errors";

describe("error tracking via window.trackError", () => {
  it("sends one application_error with attribution and dedupes repeats", () => {
    const captured: any[] = [];

    // Error tracking is v2-only (v1's trackError is a no-op), so load the tracker
    // with version=2. Stub the page document so we don't depend on the shared
    // v1 fixture (public/index.test.html); the tracker bundle itself is still
    // served by the express server at :3000.
    cy.intercept("GET", "http://localhost:1234/", {
      headers: { "content-type": "text/html" },
      body:
        "<!DOCTYPE html><html><head></head><body>" +
        '<script src="http://localhost:3000/index.js?appId=universal-tag-staging-test&version=2"></script>' +
        "</body></html>",
    }).as("page");

    cy.intercept("POST", "**/analytics/track", (req) => {
      appErrorsFrom(req.body).forEach((d) => captured.push(d));
    }).as("track");

    cy.visit("http://localhost:1234/");

    // The tracker loads async; wait until the public global exists...
    cy.window({ timeout: 20000 }).should((win: any) => expect(win.trackError).to.be.a("function"));
    // ...and until the Snowplow SDK is live and flushing (its initial pageview POST),
    // so the error we fire next is sent deterministically rather than queued pre-load.
    cy.wait("@track", { timeout: 20000 });

    cy.window().then((win: any) => {
      const err = new Error("boom");
      win.trackError(err, "cypress-test");
      win.trackError(err, "cypress-test"); // same environment|message → deduped
      win.tracker("flushBuffer");
    });

    cy.wrap(null, { timeout: 15000 }).should(() => {
      const mine = captured.filter((d) => d.message === "[cypress-test] boom");
      expect(mine.length, "exactly one application_error after dedupe").to.eq(1);
    });
  });
});
