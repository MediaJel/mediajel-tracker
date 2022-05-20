import { QueryStringContext } from '../../shared/types';

const signup = (context: QueryStringContext): void => {
  delete context.appId && delete context.event && delete context.version && delete context.collector;

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
    data: {
      ...context
    }
  });
}

export default signup;
