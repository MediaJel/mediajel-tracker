import { TagContext } from "../../../shared/types";

const recordIntegration = ({
  appId,
  environment,
  version,
}: Pick<TagContext, "appId" | "environment" | "version">) => {
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
