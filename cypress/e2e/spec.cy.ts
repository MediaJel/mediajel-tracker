describe("Ensure locally compiled universal tag is loaded", () => {
  it("Navigates to test-dev server", () => {
    cy.visit("http://localhost:1234");
  });

  it("Loads locally compiled universal tag via express server", () => {
    cy.get("script[src*='localhost:3000/index.js?']").should("exist");
  });

  it("Loads snowplow sp.js", () => {
    cy.get("script").should("have.attr", "src", "//dm2q9qfzyjfox.cloudfront.net/sp.js");
  });
});

// describe("Ensure locally compiled universal tag is sending events to Snowplow collectors", () => {
//   it("Checks for Snowplow XHR POST requests on production", () => {
//     cy.intercept("POST", "http://collector-azsx401.dmp.cnna.io/com.snowplowanalytics.snowplow/tp2").as("production");
//     cy.visit("http://localhost:1234");

//     cy.wait("@production").then((intercept) => {
//       expect(intercept.response.statusCode).to.equal(200);
//       expect(intercept.request.body.data[0].aid).to.equal("universal-tag-staging-test");
//     });
//   });
// });
