import { QueryStringContext } from "/src/shared/types"

const createSnowplowTracker = () => {
    return {
        legacy: async (context: QueryStringContext) => {
            const t = await import("/src/snowplow/legacy")
            t.default(context)
        },
        standard: async (context: QueryStringContext) => {
            const t = await import("/src/snowplow/standard")
            t.default(context)
        }
    }
}

export default createSnowplowTracker