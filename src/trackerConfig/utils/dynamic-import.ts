import { DynamicContext, EcommerceContext } from "../../interface";

// Dynamically imports the correct tracker config based
// on arguments provided from tag params
export default async function dynamicImport(
  context: DynamicContext
): Promise<void> {
  const { environment, appId, retailId } = context;
  const ecommerceContext: EcommerceContext = { appId, retailId };

  switch (environment) {
    case "jane": {
      const { default: func } = await import("../platforms/jane");
      func(ecommerceContext);
      break;
    }
    case "dutchie": {
      const { default: func } = await import("../platforms/dutchie");
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
    default:
      console.error("Undefined environment");
      break;
  }
}
