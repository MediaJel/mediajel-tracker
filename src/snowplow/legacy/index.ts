import { QueryStringContext, SnowplowBrowserTracker, SnowplowTracker, TransactionEvent } from "/src/shared/types"
import init from "/src/snowplow/legacy/init"

const trackTransaction = (tracker: SnowplowBrowserTracker) => {
    return {
        trackTransaction(transaction: TransactionEvent) {

            tracker("addTrans", transaction.id, "AFFILIATION") // TO BE CONTINUED
        }
    }
}

const createSnowplowLegacyTracker = (context: QueryStringContext): SnowplowTracker => {
    const tracker = init(context)

    return {
        ...trackTransaction(tracker),
    }
}

export default createSnowplowLegacyTracker