import { QueryStringContext, SignupParams } from '../../shared/types';

const signup = (context: QueryStringContext): void => {
  const { uuid, firstName, lastName, gender, emailAddress, hashedEmailAddress, address, city, state, phoneNumber, advertiser } = context

  const data: Partial<SignupParams> = {
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
    advertiser
  }

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
    data
  });
}

export default signup;
