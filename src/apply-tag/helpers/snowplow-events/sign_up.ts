import { createHash } from 'crypto';
import { SignUp } from '../../../shared/types';

const sign_up = ({
  uuid,
  firstName,
  lastName,
  gender,
  emailAddress,
  address,
  city,
  state,
  phoneNumber,
  advertiser
}: Pick<SignUp, "uuid" | "firstName" | "lastName" | "gender" | "emailAddress" | "address" | "city" | "state" | "phoneNumber" | "advertiser">) => {
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

export default sign_up;
