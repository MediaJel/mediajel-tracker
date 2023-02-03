import { QueryStringContext } from "../../../shared/types";

export default async (context: QueryStringContext): Promise<void> => {
  const { appId, environment, retailId } = context;
  switch (environment) {
    //* STABLE
    case "jane":
      import("./jane").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "dutchie-subdomain":
      import("./dutchie-subdomain").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "dutchie-iframe":
      import("./dutchie-iframe").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "meadow":
      import("./meadow").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "tymber":
      import("./tymber").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "woocommerce":
      import("./woocommerce").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "greenrush":
      import("./greenrush").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "buddi":
      import("./buddi").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "shopify":
      import("./shopify").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* UNSTABLE
    case "lightspeed":
      import("./lightspeed").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "olla":
      import("./olla").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "grassdoor":
      import("./grassdoor").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* STABLE
    case "wefunder":
      import("./wefunder").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* UNSTABLE
    case "ecwid":
      import("./ecwid").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* UNSTABLE
    case "square":
      import("./square").then(({ default: load }): void => load({ appId, retailId }));
      break;
    //* UNSTABLE
    case "dutchie-plus":
      import("./dutchie-plus").then(({ default: load }): void => load({ appId, retailId }));
      break;
    default:
      throw new Error("Undefined environment");
  }
};
