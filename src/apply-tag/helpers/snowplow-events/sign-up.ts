import { SignUp } from '../../../shared/types';

const signUp = (context: SignUp) => {
  const { uuid, firstName, lastName, gender, emailAddress, address, city, state, phoneNumber, advertiser } = context;

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
    data: {
      uuid: uuid,
      firstName: firstName,
      lastName: lastName,
      gender: gender,
      emailAddress: emailAddress,
      address: address,
      city: city,
      state: state,
      phoneNumber: phoneNumber,
      advertiser: advertiser
    }
  });
}

export default signUp;
