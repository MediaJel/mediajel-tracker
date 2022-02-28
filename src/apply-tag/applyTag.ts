import loadTracker from "./helpers/snowplow-events/load-tracker";
import recordIntegration from './helpers/snowplow-events/record-integration'
import signUp from "./helpers/snowplow-events/sign-up";
import pageview from "./helpers/snowplow-events/pageview";
import { chooseCart, chooseImpression } from "./helpers/dynamic-import";
import { Impressions, QueryStringParams, SignUp, Transactions } from "../shared/types";

const applyTag = async (context: any) => {
  let isTrackerInitialized: Boolean = false;

  if(!window.tracker) {
    loadTracker(context as QueryStringParams);
    isTrackerInitialized = true;
  }

  if(context.event === "transaction" || context.event === "impression")
  {
    pageview();
    recordIntegration(context as Transactions);
  }

  if (isTrackerInitialized) {
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
