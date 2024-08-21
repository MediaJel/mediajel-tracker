import { createSegments } from "src/shared/segment-builder";
import { QueryStringContext } from "../../../shared/types";

export default async (context: QueryStringContext, segments: ReturnType<typeof createSegments>): Promise<void> => {
  const { appId, environment, retailId } = context;
  switch (environment) {
    //* NEW CART
    case "weave":
      import("./weave").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "weave is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* NEW CART
    case "leafly":
      import("./leafly").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "leafly is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "jane":
      import("./jane").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "jane is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "dutchie-subdomain":
      import("./dutchie-subdomain").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "dutchie-subdomain is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "dutchie-iframe":
      import("./dutchie-iframe").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "dutchie-iframe is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "meadow":
      import("./meadow").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "meadow is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "tymber":
      import("./tymber").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "tymber is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "woocommerce":
      import("./woocommerce").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "woocommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "greenrush":
      import("./greenrush").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "greenrush is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "buddi":
      import("./buddi").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "buddi is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "shopify":
      import("./shopify").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "shopify is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "lightspeed":
      import("./lightspeed").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "lightspeed is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "olla":
      import("./olla").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "olla is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "grassdoor":
      import("./grassdoor").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "grassdoor is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "wefunder":
      import("./wefunder").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "wefunder is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "ecwid":
      import("./ecwid").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "ecwid is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "square":
      import("./square").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "square is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "dutchieplus":
      import("./dutchie-plus").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "dutchieplus is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "webjoint":
      import("./webjoint").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "webjoint is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "sticky-leaf":
      import("./sticky-leaf").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "sticky-leaf is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "dispense":
      import("./dispense").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "dispense is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "bigcommerce":
      import("./bigcommerce").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "bigcommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    //* STABLE
    case "yotpo":
      import("./yotpo").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "yotpo is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    //* UNSTABLE
    case "magento":
      import("./magento").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "magento is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "thirdparty":
      import("./thirdparty").then(({ default: load }): void => load());
      // description: "thirdparty is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "wix":
      import("./wix").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "wix is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "sweed":
      import("./sweed").then(({ default: load }): void => load({ appId, retailId }, segments));
      // description: "sweed is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    default:
      throw new Error("Undefined environment");
  }
};
