import { createHash } from 'crypto';

export default function liquidm() {
  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-1",
    data: {
      uuid: "uuid",
      firstName: "firstName",
      lastName: "lastName",
      gender: "gender",
      emailAddress: "emailAddress",
      address: "address",
      city: "city",
      state: "state",
      phoneNumber: "useragent",
      advertiser: "user_ipaddress"
    }
  });

  fetch("https://collector.dmp.mediajel.ninja/com.snowplowanalytics.iglu/v1?schema=iglu:com.mediajel.events/sign_up/jsonschema/1-0-1&aid=TestingSignUps&firstName={{FirstName}}&lastName={{lastName}}&gender={{gender}}&emailAddress={{emailAddress}}&address={{address}}&city={{city}}&state={{state}}&phoneNumber={{phoneNumber}}");
}
