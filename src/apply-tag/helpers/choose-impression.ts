import { Impressions } from "../../shared/types";

const chooseImpression = async (context: Impressions) => {
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

export default chooseImpression;
