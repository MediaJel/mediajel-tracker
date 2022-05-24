import createTracker from "./snowplow/create-tracker";
import { QueryStringContext } from "../shared/types";
import { debuggerPlugin } from "./snowplow/plugins";
import { liquidMRetargetingPixel } from "./partners/liquidm/retargeting-pixel";
import { tapadCookieSyncPixel } from "./partners/tapad/cookie-sync-pixel";
import { tapadHashSyncPixel } from "./partners/tapad/hash-sync-pixel";


const applyV2 = (context: QueryStringContext): void => {
    createTracker(context);
    liquidMRetargetingPixel()
    tapadCookieSyncPixel()
    tapadHashSyncPixel()

    // For debugging
    if (context.test === "true") {
        debuggerPlugin()
    }
};

export default applyV2
