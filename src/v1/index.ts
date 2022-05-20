import loadTracker from "./snowplow-events/load-tracker";
import signup from "./snowplow-events/signup";
import { chooseCart, chooseImpression } from "./imports/import";
import { QueryStringContext, SignupParams } from "../shared/types";

const applyV1 = (context: QueryStringContext): void => {
    loadTracker(context);

    switch (context.event) {
        case "transaction":
            chooseCart(context);
            break;
        case "signup":
            signup(context);
            break;
        case "impression":
            chooseImpression(context);
            break;
        default:
            break;
    }
};

export default applyV1
