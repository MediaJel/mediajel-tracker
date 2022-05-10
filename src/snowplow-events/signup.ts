import { Signup } from '../shared/types';

const signup = (context: Signup) => {
  const signupObject: any = context;
  delete signupObject.appId && delete signupObject.event && delete signupObject.version && delete signupObject.collector;

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
    data: {
      ...signupObject
    }
  });
}

export default signup;
