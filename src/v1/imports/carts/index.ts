import { QueryStringContext } from "../../../shared/types";

const handleStableEnvironment = (environment: string, appId: string, retailId: string): void => {
  switch (environment) {
    case "jane":
    case "dutchie-subdomain":
    case "dutchie-iframe":
    case "meadow":
    case "tymber":
    case "woocommerce":
    case "greenrush":
    case "buddi":
    case "shopify":
    case "olla":
    case "grassdoor":
    case "wefunder":
    case "dispense":
    case "bigcommerce":
    case "yotpo":
      import(`./${environment.replace("-", "_")}`).then(({ default: load }): void => load({ appId, retailId }));
      break;
    default:
      throw new Error(`Undefined stable environment: ${environment}`);
  }
};

const handleUnstableEnvironment = (environment: string, appId: string, retailId: string): void => {
  switch (environment) {
    case "lightspeed":
    case "ecwid":
    case "square":
    case "dutchieplus":
    case "webjoint":
    case "sticky-leaf":
      import(`./${environment.replace("-", "_")}`).then(({ default: load }): void => load({ appId, retailId }));
      break;
    default:
      throw new Error(`Undefined unstable environment: ${environment}`);
  }
};

export default async (context: QueryStringContext): Promise<void> => {
  const { appId, environment, retailId } = context;

  const stableEnvironments: string[] = [
    "jane",
    "dutchie-subdomain",
    "dutchie-iframe",
    "meadow",
    "tymber",
    "woocommerce",
    "greenrush",
    "buddi",
    "shopify",
    "olla",
    "grassdoor",
    "wefunder",
    "dispense",
    "bigcommerce",
    "yotpo",
  ];

  const unstableEnvironments: string[] = ["lightspeed", "ecwid", "square", "dutchieplus", "webjoint", "sticky-leaf"];

  if (stableEnvironments.includes(environment)) {
    handleStableEnvironment(environment, appId, retailId);
  } else if (unstableEnvironments.includes(environment)) {
    handleUnstableEnvironment(environment, appId, retailId);
  } else {
    throw new Error("Undefined environment");
  }
};
