import { QueryStringContext } from "/src/shared/types"

const createSnowplowTracker = () => {
    return {
        legacy: async (context: QueryStringContext) => await import("/src/snowplow/legacy"),
        standard: async (context: QueryStringContext) => await import("/src/snowplow/standard"),
    }
}

export default createSnowplowTracker