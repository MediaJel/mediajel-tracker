import loadTracker from "./helpers/snowplow-events/load-tracker";
import recordIntegration from './helpers/snowplow-events/record-integration'
import chooseCart from "./helpers/choose-cart";
import signUp from "./helpers/snowplow-events/sign-up";
import chooseImpression from "./helpers/choose-impression";
import pageview from "./helpers/snowplow-events/pageview";
import { Impressions, QueryStringParams, SignUp, Transactions } from "../shared/types";

const applyTag = (context: any) => {
  let isTrackerInitialized: Boolean = false;
  
  if(!window.tracker) {
    loadTracker(context as QueryStringParams);
    isTrackerInitialized = true;
  }

  if(context.event === 'transaction' || context.event === 'impression')
  {
    pageview(context as QueryStringParams);
    recordIntegration(context as Transactions);
  }

  if (isTrackerInitialized) {
    switch(context.event) {
      case 'transaction': 
        chooseCart(context as Transactions);
        break;
      case 'sign_up':
        signUp(context as SignUp);
        break;
      case 'impression':
        chooseImpression(context as Impressions);
        break;
      default:
        break;
    }
  }
};

export default applyTag;
