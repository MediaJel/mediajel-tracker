export const HARNESS = "http://localhost:1234/";

/** Stub the harness page with a bare v2 tag, optionally pinned to an environment.
 *  The tracker bundle itself is still served by the express server at :3000. */
export function stubV2Harness(environment?: string): void {
  const env = environment ? `&environment=${environment}` : "";
  cy.intercept("GET", HARNESS, {
    headers: { "content-type": "text/html" },
    body:
      "<!DOCTYPE html><html><head></head><body>" +
      `<script src="http://localhost:3000/index.js?appId=universal-tag-staging-test${env}&version=2"></script>` +
      "</body></html>",
  }).as("page");
}
