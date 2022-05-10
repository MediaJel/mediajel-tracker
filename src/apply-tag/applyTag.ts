import loadTracker from "../snowplow-events/instantiate-tracker";
import signup from "../snowplow-events/signup";
import { chooseCart, chooseImpression } from "./dynamic-import";
import { Impressions, Signup, Transactions } from "../shared/types";

const applyTag = async (context) => {
  if(!window.tracker) {
    loadTracker(context as Transactions);
  }

  if(!context.appId) {
    throw new Error("appId is required");
  };

  switch(context.event) {
    case "transaction": 
      await chooseCart(context as Transactions);
      break;
    case "signup":
      signup(context as Signup);
      break;
    case "impression":
      await chooseImpression(context as Impressions);
      break;
    default:
      break;
  }
};

export default applyTag;
