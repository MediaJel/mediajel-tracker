function getQueryString() {
  const scripts = document.getElementsByTagName('script');
  const index = scripts.length - 1;
  const myScript = scripts[index];
  const querystring = myScript.src.substring(myScript.src.indexOf("?"));
  const params = new URLSearchParams( querystring );
  const queryStringResult = Object.fromEntries(params.entries());
  return queryStringResult;
}

function getContextObject() {
  const queryStringResult = getQueryString();
  const contextObject = {
    ...queryStringResult,
    appId: queryStringResult.appId ?? queryStringResult.mediajelAppId, // Legacy support for old universal tag
    version: queryStringResult.version ?? "latest",
    collector: queryStringResult.test
      ? true
      : false,
    event: queryStringResult.event ?? "transaction",
  };
  
  // Delete useless key-value pair in contextObject
  delete contextObject.mediajelAppId && delete contextObject.test;
  return contextObject;
};

function awaitTesting(context) {
  if(!context.appId) {
    throw new Error("appId is required");
  }
  snowplowTracker(context);
}

function snowplowTracker(context) {
  const { appId } = context;

  if(!window.tracker) {
    (function (e, o, n, t, a, c, i) {
      if (!e[a]) {
        e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
        e.GlobalSnowplowNamespace.push(a);
        e[a] = function () {
          (e[a].q = e[a].q || []).push(arguments);
        };
        e[a].q = e[a].q || [];
        c = o.createElement(n);
        i = o.getElementsByTagName(n)[0];
        c.async = 1;
        c.src = t;
        i.parentNode.insertBefore(c, i);
      }
    })(
      window,
      document,
      "script",
      "https://dm2q9qfzyjfox.cloudfront.net/sp.js",
      "tracker"
    );
  
  window.tracker("newTracker", "test", `//collector.dmp.mediajel.ninja`, {
    appId: appId,
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    respectDoNotTrack: true,
  });
  
  window.tracker("enableActivityTracking", {
    minimumVisitLength: 30,
    heartbeatDelay: 10,
  });
  window.tracker("trackPageView");

  // Object.keys(context).forEach(key => {
  //   if(key === "appId") {
  //     console.log("appId is not tracked");
  //     return; // Skip appId field
  //   }
  //   const concatData = context.appId + context[key];
  //   key = concatData;

  //   console.log("objectKey: " + key);
  // })

  // for(let [key, value] of Object.entries(context)) {
  //   if(key === "appId") {
  //     continue; // Skip appId field
  //   }
  //   const concatData = context.appId + value;
  //   key = concatData;

  //   console.log("objectKey: " + key);
  // }
  }
}

async function main() {
  const context = getContextObject();
  console.log(context);
  await awaitTesting(context);
}

function formTracking() {
  const object = [];
  const value1 = {
    name: "firstname",
    value: "John",
  };
  const value2 = {
    name: "lastname",
    value: "Doe",
  };
  const value3 = {
    name: "company",
    value: "Deer",
  };
  const value4 = {
    name: "email",
    value: "johndoe@gmail.com",
  };
  const value5 = {
    name: "job_function",
    value: "Developer",
  };
  const value6 = {
    name: "phone",
    value: "(555) 555-5555",
  };
  const value7 = {
    name: "user_type",
    value: "individual",
  };
  const value8 = {
    name: "primary_operating_state_of_referral",
    value: "CA",
  };
  object.push(value1);
  object.push(value2);
  object.push(value3);
  object.push(value4);
  object.push(value5);
  object.push(value6);
  object.push(value7);
  object.push(value8);
  const newObject = {
    // firstName: "",
    // lastName: "",
    // companyName: "",
    // emailAddress: "",
    // jobFunction: "",
    // phoneNumber: "",
    // userType: "",
    // state: "",
  };

  object.forEach(data => {
    switch(data.name) {
      case "firstname": newObject.firstName = data.value; break;
      case "lastname": newObject.lastName = data.value; break;
      case "company": newObject.companyName = data.value; break;
      case "email": newObject.emailAddress = data.value; break;
      case "job_function": newObject.jobFunction = data.value; break;
      case "phone": newObject.phoneNumber = data.value; break;
      case "user_type": newObject.userType = data.value; break;
      case "primary_operating_state_of_referral": newObject.state = data.value; break;
      default: break;
    }
  });

  window.tracker("trackSelfDescribingEvent", {
    schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-1",
    data: {
      firstName: newObject.firstName,
      lastName: newObject.lastName,
      emailAddress: newObject.emailAddress,
      hashedEmailAddress: newObject.emailAddress,
      companyName: newObject.companyName,
      jobFunction: newObject.jobFunction,
      phoneNumber: newObject.phoneNumber,
      userType: newObject.userType,
      state: newObject.state,
    },
  });
}

try{
  main();
  // formTracking();
}
catch (err) {
  console.error("console.error: ", err.message);
}
