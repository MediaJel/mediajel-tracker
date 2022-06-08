import { SignupParams } from "../../../shared/types";

const signup = (context: Partial<SignupParams>): void => {
  const {
    uuid,
    firstName,
    lastName,
    gender,
    emailAddress,
    hashedEmailAddress,
    address,
    city,
    state,
    phoneNumber,
    advertiser,
  } = context;

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
    data: {
      uuid,
      firstName,
      lastName,
      gender,
      emailAddress,
      hashedEmailAddress,
      address,
      city,
      state,
      phoneNumber,
      advertiser,
    },
  });
};

export default signup;
