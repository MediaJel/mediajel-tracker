describe("Ensures universal tag does not error", () => {
  it("Navigates to test-dev server", () => {
    cy.visit("http://localhost:1234");
  });

  it("Loads locally compiled universal tag via express server", () => {
    cy.get("script[src*='localhost:3000/index.js?']").should("exist");
  });

  it("Loads snowplow sp.js", () => {
    cy.get("script").should("have.attr", "src", "//dm2q9qfzyjfox.cloudfront.net/sp.js");
  });

  it("Checks for Snowplow XHR POST requests on production", () => {
    cy.intercept("POST", "http://collector.dmp.cnna.io/com.snowplowanalytics.snowplow/tp2", (req) => {
      req.reply({ statusCode: 200 });
    });
  });
});
