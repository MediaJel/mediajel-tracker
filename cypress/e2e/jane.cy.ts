describe("Testing for Jane cart", () => {
  beforeEach(() => cy.visit("http://localhost:1234/"));
  it("landed on the website", () => {
    cy.get("#jane-menu")
      .its("0.contentDocument")
      .should("exist")
      .its("body")
      .should("not.be.undefined")
      .then(cy.wrap)
      .find("#results")
      .should("be.visible");
  });
});
