import { QueryStringContext } from "/src/shared/types"
import init from "/src/snowplow/legacy/init"

const createSnowplowLegacyTracker = (context: QueryStringContext) => {
    const tracker = init(context)    
    return {}
}

export default createSnowplowLegacyTracker