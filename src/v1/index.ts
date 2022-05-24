import loadTracker from "./snowplow-events/load-tracker";
import signup from "./snowplow-events/signup";
import { QueryStringContext } from "../shared/types";

const applyV1 = (context: QueryStringContext): void => {
    loadTracker(context);

    switch (context.event) {
        case "transaction": import("./imports/carts").then(({ default: load }): Promise<void> => load(context));
            break;
        case "signup":
            signup(context);
            break;
        case "impression": import("./imports/impressions").then(({ default: load }): Promise<void> => load(context));
            break;
        default:
            break;
    }
};

export default applyV1
