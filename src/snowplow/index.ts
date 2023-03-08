import createSnowplowV1Tracker from "./v1"
import createSnowplowV2Tracker from './v2'


const createSnowplowTracker = () => {
    return {
        v1: createSnowplowV1Tracker(),
        v2: createSnowplowV2Tracker()
    }
}

export default createSnowplowTracker