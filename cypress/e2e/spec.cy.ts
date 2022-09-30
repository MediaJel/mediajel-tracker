describe("Ensure locally compiled universal tag is loaded", () => {
  it("Navigates to test-dev server", () => {
    cy.visit("http://localhost:1234");
  });

  it("Loads locally compiled universal tag via express server", () => {
    cy.get("script[src*='localhost:3000/index.js?']").should("exist");
  });

  it("Checks for Snowplow XHR POST requests on production", () => {
    cy.intercept("POST", "http://collector.dmp.cnna.io/com.snowplowanalytics.snowplow/tp2").as("production");
    cy.wait("@production").then((intercept) => {
      console.log(intercept.response.statusCode);
      expect(intercept.response.statusCode).to.equal(200);
    });
  });

  it("Loads snowplow sp.js", () => {
    cy.get("script").should("have.attr", "src", "//dm2q9qfzyjfox.cloudfront.net/sp.js");
  });
});

// describe("Ensure locally compiled universal tag is sending events to Snowplow collectors", () => {
// it("Checks for Snowplow XHR POST requests on staging (&test=true)", () => {
//   cy.intercept("POST", "http://collector.dmp.mediajel.ninja/com.snowplowanalytics.snowplow/tp2").as("staging");
//   cy.wait("@staging").then((intercept) => {
//     console.log(intercept.response.statusCode);
//     expect(intercept.response.statusCode).to.equal(200);
//   });
// });
// });
