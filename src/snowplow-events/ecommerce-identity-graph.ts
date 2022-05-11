import { Transactions } from "../shared/types";

const ecommerceIdentityGraph = (ecommerceIdentityObject) => {
  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/ecommerce_identity_graph/jsonschema/1-0-0",
    data: {
      ...ecommerceIdentityObject
    }
  });
};

export default ecommerceIdentityGraph;
