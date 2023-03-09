import { QueryStringContext } from "/src/shared/types"


const createSnowplowTracker = () => {
    return {
        legacy: async (ctx: QueryStringContext) => await import("/src/snowplow/legacy").then(({ default: legacy }) => legacy(ctx)),
        standard: async (ctx: QueryStringContext) => await import("/src/snowplow/standard").then(({ default: standard }) => standard(ctx)),
    }
}

export default createSnowplowTracker