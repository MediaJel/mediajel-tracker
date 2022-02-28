import { Transactions, Impressions } from "../../shared/types";

export const chooseCart = async (context: Transactions) => {
  const { appId, environment, retailId } = context;
  switch (environment) {
    //* STABLE
    case "jane": {
      const { default: func } = await import("./carts/jane");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "dutchie-subdomain": {
      const { default: func } = await import(
        "./carts/dutchie-subdomain"
      );
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "dutchie-iframe": {
      const { default: func } = await import(
        "./carts/dutchie-iframe"
      );
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "meadow": {
      const { default: func } = await import("./carts/meadow");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "tymber": {
      const { default: func } = await import("./carts/tymber");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "woocommerce": {
      const { default: func } = await import(
        "./carts/woocommerce"
      );
      func({ appId, retailId });
      break;
    }
    //* STABLE 
    case "greenrush": {
      const { default: func } = await import("./carts/greenrush");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "buddi": {
      const { default: func } = await import("./carts/buddi");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "shopify": {
      const { default: func } = await import("./carts/shopify");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "lightspeed": {
      const { default: func } = await import("./carts/lightspeed");
      func({ appId, retailId });
      break;
    }
    //* STABLE
    case "olla": {
      const { default: func } = await import("./carts/olla");
      func({ appId, retailId });
      break;
    }
    default:
      console.error("Undefined environment");
      break;
  }
}

export const chooseImpression = async (context: Impressions) => {
  const { environment } = context;
  switch (environment) {
    case "liquidm": {
      const { default: func } = await import("./impressions/liquidm");
      func();
      break;
    }
    default:
      console.error("Undefined environment");
      break;
  }
}
