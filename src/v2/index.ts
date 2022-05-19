import createTracker from "./snowplow/create-tracker";
import { QueryStringContext } from "../shared/types";
import { debuggerPlugin } from "./snowplow/plugins";


const applyV2 = (context: QueryStringContext): void => {
    createTracker(context);

    // For debugging
    if (context.test === "true") {
        debuggerPlugin()
    }
};

export default applyV2
