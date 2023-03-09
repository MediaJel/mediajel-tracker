import { QueryStringContext } from "/src/shared/types"
import init from "/src/snowplow/standard/init"

const createSnowplowStandardTracker = (context: QueryStringContext) => {
    console.log("Create Snowplow Standard Tracker")
    const tracker = init(context)
    return {}
}

export default createSnowplowStandardTracker
