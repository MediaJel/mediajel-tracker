import loadTracker from "./snowplow-events/instantiate-tracker";
import signup from "./snowplow-events/signup";
import { chooseCart, chooseImpression } from "./utils/dynamic-import";
import { QueryStringContext, Signup } from "../shared/types";

const applyV1 = (context: QueryStringContext): void => {
    loadTracker(context);
    console.log({ context })

    switch (context.event) {
        case "transaction":
            chooseCart(context);
            break;
        case "signup":
            signup(context as Signup); // <--- Not sure if this works or not
            break;
        case "impression":
            chooseImpression(context);
            break;
        default:
            break;
    }
};

export default applyV1
