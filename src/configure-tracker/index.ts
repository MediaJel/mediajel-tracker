import { DynamicContext, PageviewContext } from "./helpers/interface";
import { ContextInterface } from "../helpers/interface";
import entrypoint from "./helpers/entrypoint";

const trackerConfig = async (context: ContextInterface) => {
  const { environment, retailId, appId, collector } = context;

  const snowplow: Boolean = entrypoint({ appId, collector, retailId });

  if (snowplow && environment) {
    switch (environment) {
      case "jane": {
        const { default: func } = await import("./platforms/jane");
        func({ appId, retailId });
        break;
      }
      case "dutchie-subdomain": {
        const { default: func } = await import("./platforms/dutchie-subdomain");
        func({ appId, retailId });
        break;
      }
      case "dutchie-iframe": {
        const { default: func } = await import("./platforms/dutchie-iframe");
        func({ appId, retailId });
        break;
      }
      case "meadow": {
        const { default: func } = await import("./platforms/meadow");
        func({ appId, retailId });
        break;
      }
      case "tymber": {
        const { default: func } = await import("./platforms/tymber");
        func({ appId, retailId });
        break;
      }
      case "woocommerce": {
        const { default: func } = await import("./platforms/woocommerce");
        func({ appId, retailId });
        break;
      }
      case "greenrush": {
        const { default: func } = await import("./platforms/greenrush");
        func({ appId, retailId });
        break;
      }
      case "buddi": {
        const { default: func } = await import("./platforms/buddi");
        func({ appId, retailId });
        break;
      }
      case "shopify": {
        const { default: func } = await import("./platforms/shopify");
        func({ appId, retailId });
        break;
      }
      case "liquidm": {
        const { default: func } = await import("./platforms/liquidm");
        func();
        break;
      }
      default:
        console.error("Undefined environment");
        break;
    }
  }
};

export default trackerConfig;
