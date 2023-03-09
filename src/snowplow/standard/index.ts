import { QueryStringContext, SnowplowBrowserTracker, SnowplowTracker, TransactionEvent } from "/src/shared/types"
import init from "/src/snowplow/standard/init"


const trackTransaction = (tracker: SnowplowBrowserTracker) => {
    return {
        trackTransaction(transaction: TransactionEvent) {
            
        }
    }
}

const createSnowplowStandardTracker = (context: QueryStringContext): SnowplowTracker => {
    const tracker = init(context)
    return {
        ...trackTransaction(tracker),
    }
}

export default createSnowplowStandardTracker
