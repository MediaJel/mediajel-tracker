import createSnowplowV1Tracker from "@/snowplow/v1"
import createSnowplowV2Tracker from '@/snowplow/v2'


const createSnowplowTracker = () => {
    return {
        v1: createSnowplowV1Tracker(),
        v2: createSnowplowV2Tracker()
    }
}

export default createSnowplowTracker