import { SignUp } from '../../../shared/types';
import encrypt from '../utils/encrypt';

const signUp = (context: SignUp) => {
  const { uuid, firstName, lastName, gender, emailAddress, address, city, state, phoneNumber, advertiser } = context;

  Object.keys(context).forEach(key => {
    if(key === "appId") {
      return; // Skip appId field
    }
    key = encrypt(context.appId, context[key]);
  })

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-1",
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
