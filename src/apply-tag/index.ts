import entrypoint from "./helpers/snowplow-events/entrypoint";
import recordIntegration from './helpers/snowplow-events/record-integration'
import { TagContext } from "../shared/types";

const applyTag = async (context: TagContext) => {
  const { environment, retailId, appId, collector, version, event } = context;

  const isSnowplowEnabled: Boolean = entrypoint({ appId, collector, retailId, event });

  recordIntegration({ appId, environment, version })

  if (isSnowplowEnabled && environment) {
    switch (environment) {
      //* STABLE
      case "jane": {
        const { default: func } = await import("./helpers/platforms/jane");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "dutchie-subdomain": {
        const { default: func } = await import(
          "./helpers/platforms/dutchie-subdomain"
        );
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "dutchie-iframe": {
        const { default: func } = await import(
          "./helpers/platforms/dutchie-iframe"
        );
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "meadow": {
        const { default: func } = await import("./helpers/platforms/meadow");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "tymber": {
        const { default: func } = await import("./helpers/platforms/tymber");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "woocommerce": {
        const { default: func } = await import(
          "./helpers/platforms/woocommerce"
        );
        func({ appId, retailId });
        break;
      }
      //* STABLE 
      case "greenrush": {
        const { default: func } = await import("./helpers/platforms/greenrush");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "buddi": {
        const { default: func } = await import("./helpers/platforms/buddi");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "shopify": {
        const { default: func } = await import("./helpers/platforms/shopify");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "lightspeed": {
        const { default: func } = await import("./helpers/platforms/lightspeed");
        func({ appId, retailId });
        break;
      }
      //* STABLE
      case "olla": {
        const { default: func } = await import("./helpers/platforms/olla");
        func({ appId, retailId });
        break;
      }
      //! UNUSED/DEPRECATED
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
