describe("spec5.cy", () => {
  it("tests spec5.cy", () => {
    cy.viewport(1258, 911);
    cy.visit("http://ec2-3-90-160-66.compute-1.amazonaws.com:7777/shop/");
    cy.get("li.post-62 button > span").click();
    cy.get("li.post-62 > div.wp-block-button a").click();
    cy.location("href").should("eq", "http://ec2-3-90-160-66.compute-1.amazonaws.com:7777/cart/");
    cy.get("div.wc-block-cart__submit span").click();
    cy.location("href").should("eq", "http://ec2-3-90-160-66.compute-1.amazonaws.com:7777/checkout/");
    cy.get("#email").click();
    cy.get("#email").type("test@mail.com");
    cy.get("#shipping-first_name").click();
    cy.get("#shipping-first_name").type("tester");
    cy.get("#shipping-last_name").click();
    cy.get("#shipping-last_name").type("test");
    cy.get("#shipping-address_1").click();
    cy.get("#shipping-address_1").type("test st. 123");
    cy.get("#shipping-city").click();
    cy.get("#shipping-city").type("test");
    cy.get("div.wc-block-components-address-form__phone > label").click();
    cy.get("#shipping-phone").type("3434344343");
    cy.get("#shipping-postcode").click();
    cy.get("#shipping-postcode").type("33705");
    cy.get("div.wc-block-checkout__actions span").click();
    cy.get("div.wc-block-checkout__actions span").click();

    cy.intercept("POST", "http://collector-azsx401.dmp.cnna.io/com.snowplowanalytics.snowplow/tp2").as("production");

    cy.location("pathname", { timeout: 10000 }).should("include", "/checkout/order-received/");
    cy.location("search").should("include", "key=wc_order_");

    cy.wait("@production").then((intercept) => {
      expect(intercept.response.statusCode).to.equal(200);
      expect(intercept.request.body.data[0].aid).to.equal("universal-tag-staging-test");
    });
    cy.location("href").then((currentUrl) => {
      const orderId = currentUrl.split("/order-received/")[1].split("/")[0];
      const orderKey = new URL(currentUrl).searchParams.get("key");
      cy.log("Order ID:", orderId);
      cy.log("Order Key:", orderKey);
    });
  });
});
