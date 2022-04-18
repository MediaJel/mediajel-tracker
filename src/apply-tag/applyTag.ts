import loadTracker from "./helpers/snowplow-events/instantiate-tracker";
import signUp from "./helpers/snowplow-events/sign-up";
import pageview from "./helpers/snowplow-events/pageview";
import { chooseCart, chooseImpression } from "./helpers/dynamic-import";
import { Impressions, SignUp, Transactions } from "../shared/types";

const applyTag = async (context) => {
  const isTrackerInitialized: Boolean = loadTracker(context as Transactions);

  // if(!context.appId) {
  //   throw new Error("appId is required");
  // };

  if (isTrackerInitialized) {
    pageview(context as Transactions);
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
