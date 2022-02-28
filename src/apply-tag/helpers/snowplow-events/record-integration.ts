import { Transactions } from "../../../shared/types";

const recordIntegration = (context: Transactions) => {
  const { appId, environment, version } = context;
  const recordSchema = {
    schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
    data: {
      appId,
      cart: environment,
      version,
    },
  };

  window.tracker("trackSelfDescribingEvent", recordSchema);
};

export default recordIntegration;
