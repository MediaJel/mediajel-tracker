import loadTracker from "./helpers/snowplow-events/instantiate-tracker";
import signUp from "./helpers/snowplow-events/sign-up";
import { chooseCart, chooseImpression } from "./helpers/dynamic-import";
import { Impressions, SignUp, Transactions } from "../shared/types";

const applyTag = async (context) => {
  let isTrackerInitialized: Boolean = false;

  if(!window.tracker) {
    loadTracker(context as Transactions);
    isTrackerInitialized = true;
  }
  console.log(context);
  console.log(context.appId);

  if(!context.appId) {
    // throw new Error("appId is required");
    console.log("context is empty: " + JSON.parse(context));
    console.log("context.appId is null: " + context.appId);
  };

  if (isTrackerInitialized) {
    console.log(context.event);
    switch(context.event) {
      case "transaction": 
        await chooseCart(context as Transactions);
        break;
      case "sign_up":
        signUp(context as SignUp);
        break;
      case "impression":
        await chooseImpression(context as Impressions);
        break;
      default:
        break;
    }
  }
};

export default applyTag;
