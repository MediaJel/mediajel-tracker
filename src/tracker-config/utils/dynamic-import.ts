import { DynamicContext, EcommerceContext } from "../../interface";

// Dynamically imports the correct tracker config based
// on arguments provided from tag params
async function dynamicImport(context: DynamicContext): Promise<void> {
  const { environment, appId, retailId } = context;
  const ecommerceContext: EcommerceContext = { appId, retailId };

  switch (environment) {
    case "jane": {
      const { default: func } = await import("../platforms/jane");
      func(ecommerceContext);
      break;
    }
    case "dutchie-subdomain": {
      const { default: func } = await import("../platforms/dutchie-subdomain");
      func(ecommerceContext);
      break;
    }
    case "dutchie-iframe": {
      const { default: func } = await import("../platforms/dutchie-iframe");
      func(ecommerceContext);
      break;
    }
    case "meadow": {
      const { default: func } = await import("../platforms/meadow");
      func(ecommerceContext);
      break;
    }
    case "tymber": {
      const { default: func } = await import("../platforms/tymber");
      func(ecommerceContext);
      break;
    }
    case "greenrush": {
      const { default: func } = await import("../platforms/greenrush");
      func(ecommerceContext);
      break;
    }
    case "buddi": {
      const { default: func } = await import("../platforms/buddi");
      func(ecommerceContext);
      break;
    }
    case "liquidm": {
      const { default: func } = await import("../platforms/liquidm");
      func();
      break;
    }
    default:
      console.error("Undefined environment");
      break;
  }
}
export { dynamicImport };
