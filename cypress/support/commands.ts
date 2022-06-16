/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to pass to age gate
     * @example cy.ageGatePass()
     */
    ageGatePass(): Chainable<void>;
    /**
     * Custom command to load the Jane Iframe
     * @example cy.loadJaneIframe()
     */
    loadJaneIframe(): Chainable<void>;
  }
}
Cypress.Commands.add("ageGatePass", () => {
  cy.get(".age-gate-submit-yes", { timeout: 40000 }).should("be.visible").click();
  cy.get(".off-canvas-close.awb-icon-close", { timeout: 40000 }).should("be.visible").click();
});

Cypress.Commands.add("loadJaneIframe", () => {
  cy.get("#jane-menu")
    .its("0.contentDocument")
    .should("exist")
    .its("body")
    .should("not.be.undefined")
    .then(cy.wrap)
    .find("#results")
    .should("be.visible");
});
