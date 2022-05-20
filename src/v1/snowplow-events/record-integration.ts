import { QueryStringContext } from "../../shared/types";

const recordIntegration = (context: QueryStringContext): void => {
  const { appId, environment: cart, version } = context;
  const recordSchema = {
    schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
    data: {
      appId,
      cart,
      version,
    },
  };

  window.tracker("trackSelfDescribingEvent", recordSchema);
};

export default recordIntegration;
