import entrypoint from "./helpers/entrypoint";
import { TagContext } from "../shared/types";

const applyTag = async (context: TagContext) => {
  const { environment, retailId, appId, collector } = context;

  const isSnowplowEnabled: Boolean = entrypoint({ appId, collector, retailId });

  if (isSnowplowEnabled && environment) {
    switch (environment) {
      case "jane": {
        const { default: func } = await import("./helpers/platforms/jane");
        func({ appId, retailId });
        break;
      }
      case "dutchie-subdomain": {
        const { default: func } = await import(
          "./helpers/platforms/dutchie-subdomain"
        );
        func({ appId, retailId });
        break;
      }
      case "dutchie-iframe": {
        const { default: func } = await import(
          "./helpers/platforms/dutchie-iframe"
        );
        func({ appId, retailId });
        break;
      }
      case "meadow": {
        const { default: func } = await import("./helpers/platforms/meadow");
        func({ appId, retailId });
        break;
      }
      case "tymber": {
        const { default: func } = await import("./helpers/platforms/tymber");
        func({ appId, retailId });
        break;
      }
      case "woocommerce": {
        const { default: func } = await import(
          "./helpers/platforms/woocommerce"
        );
        func({ appId, retailId });
        break;
      }
      case "greenrush": {
        const { default: func } = await import("./helpers/platforms/greenrush");
        func({ appId, retailId });
        break;
      }
      case "buddi": {
        const { default: func } = await import("./helpers/platforms/buddi");
        func({ appId, retailId });
        break;
      }
      case "shopify": {
        const { default: func } = await import("./helpers/platforms/shopify");
        func({ appId, retailId });
        break;
      }
      case "liquidm": {
        const { default: func } = await import("./helpers/platforms/liquidm");
        func();
        break;
      }
      default:
        console.error("Undefined environment");
        break;
    }
  }
};

export default applyTag;
