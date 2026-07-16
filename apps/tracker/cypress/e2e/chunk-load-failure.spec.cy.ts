// A failed environment-chunk load (CDN hiccup, adblock, CSP) must be reported
// through the error funnel — not vanish as an unhandled rejection while the
// site silently loses its commerce tracking.

// Decode Snowplow application_error payloads out of a POST body (ue_pr plain or
// ue_px base64url) — same helper as error-boundary.spec.cy.ts.
function fromB64Url(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return atob(b64);
}

function appErrorsFrom(body: any): any[] {
  const events = (body && body.data) || [];
  const out: any[] = [];
  for (const ev of events) {
    if (ev.e !== "ue") continue;
    const raw = ev.ue_pr ?? (ev.ue_px ? fromB64Url(ev.ue_px) : null);
    if (!raw) continue;
    let unstruct: any;
    try {
      unstruct = JSON.parse(raw);
    } catch {
      continue;
    }
    const inner = unstruct.data; // { schema, data }
    if (inner?.schema?.includes("application_error")) out.push(inner.data);
  }
  return out;
}

describe("environment chunk-load failure", () => {
  const HARNESS = "http://localhost:1234/";

  it("reports the failed jane chunk through the funnel and the tag survives", () => {
    const captured: any[] = [];

    // Error reporting is v2-only, so stub a v2 page requesting environment=jane.
    cy.intercept("GET", HARNESS, {
      headers: { "content-type": "text/html" },
      body:
        "<!DOCTYPE html><html><head></head><body>" +
        '<script src="http://localhost:3000/index.js?appId=universal-tag-staging-test&environment=jane&version=2"></script>' +
        "</body></html>",
    }).as("page");

    // Kill the jane data-source chunk: the loader script errors, import() rejects.
    cy.intercept("GET", "**/jane.*.js", { statusCode: 503, body: "" }).as("janeChunk");

    cy.intercept("POST", "**/analytics/track", (req) => {
      appErrorsFrom(req.body).forEach((d) => captured.push(d));
      req.reply({ statusCode: 200, body: {} });
    }).as("track");

    // Without handling, the failed import is an uncaught rejection; don't let
    // Cypress fail on it — the assertion below is the real check.
    cy.on("uncaught:exception", () => false);

    cy.visit(HARNESS);
    cy.wait("@track", { timeout: 20000 }); // SDK live (pageview) → tag itself survived
    cy.wait("@janeChunk", { timeout: 20000 }); // the chunk really was requested and failed

    // The tag must keep its public API working despite the dead environment…
    cy.window({ timeout: 20000 }).should((win: any) => expect(win.trackError).to.be.a("function"));

    // …and the failure itself must surface as one attributed application_error.
    cy.window().then((win: any) => win.tracker("flushBuffer"));
    cy.wrap(null, { timeout: 15000 }).should(() => {
      const mine = captured.filter((d) => (d.message || "").startsWith("[load:jane]"));
      expect(mine.length, "chunk-load failure reported through the funnel").to.be.greaterThan(0);
    });
  });
});
