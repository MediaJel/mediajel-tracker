import { QueryStringContext } from "../../../shared/types";

export default async (context: QueryStringContext): Promise<void> => {
  const { appId, environment, retailId } = context;
  switch (environment) {
    //* NEW CART
    case "leafly":
      import("./leafly").then(({ default: load }): void => load({ appId, retailId }));
      // description: "leafly is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "jane":
      import("./jane").then(({ default: load }): void => load({ appId, retailId }));
      // description: "jane is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "dutchie-subdomain":
      import("./dutchie-subdomain").then(({ default: load }): void => load({ appId, retailId }));
      // description: "dutchie-subdomain is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "dutchie-iframe":
      import("./dutchie-iframe").then(({ default: load }): void => load({ appId, retailId }));
      // description: "dutchie-iframe is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "meadow":
      import("./meadow").then(({ default: load }): void => load({ appId, retailId }));
      // description: "meadow is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "tymber":
      import("./tymber").then(({ default: load }): void => load({ appId, retailId }));
      // description: "tymber is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "woocommerce":
      import("./woocommerce").then(({ default: load }): void => load({ appId, retailId }));
      // description: "woocommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "greenrush":
      import("./greenrush").then(({ default: load }): void => load({ appId, retailId }));
      // description: "greenrush is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "buddi":
      import("./buddi").then(({ default: load }): void => load({ appId, retailId }));
      // description: "buddi is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "shopify":
      import("./shopify").then(({ default: load }): void => load({ appId, retailId }));
      // description: "shopify is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "lightspeed":
      import("./lightspeed").then(({ default: load }): void => load({ appId, retailId }));
      // description: "lightspeed is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "olla":
      import("./olla").then(({ default: load }): void => load({ appId, retailId }));
      // description: "olla is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "grassdoor":
      import("./grassdoor").then(({ default: load }): void => load({ appId, retailId }));
      // description: "grassdoor is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "wefunder":
      import("./wefunder").then(({ default: load }): void => load({ appId, retailId }));
      // description: "wefunder is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "ecwid":
      import("./ecwid").then(({ default: load }): void => load({ appId, retailId }));
      // description: "ecwid is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "square":
      import("./square").then(({ default: load }): void => load({ appId, retailId }));
      // description: "square is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "dutchieplus":
      import("./dutchie-plus").then(({ default: load }): void => load({ appId, retailId }));
      // description: "dutchieplus is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "webjoint":
      import("./webjoint").then(({ default: load }): void => load({ appId, retailId }));
      // description: "webjoint is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "sticky-leaf":
      import("./sticky-leaf").then(({ default: load }): void => load({ appId, retailId }));
      // description: "sticky-leaf is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "dispense":
      import("./dispense").then(({ default: load }): void => load({ appId, retailId }));
      // description: "dispense is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "bigcommerce":
      import("./bigcommerce").then(({ default: load }): void => load({ appId, retailId }));
      // description: "bigcommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "yotpo":
      import("./yotpo").then(({ default: load }): void => load({ appId, retailId }));
      // description: "yotpo is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "magento":
      import("./magento").then(({ default: load }): void => load({ appId, retailId }));
      // description: "magento is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    default:
      throw new Error("Undefined environment");
  }
};
