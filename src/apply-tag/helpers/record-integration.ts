import {TagContext} from '../../shared/types'



export default recordIntegration = ({appId, environment}): Pick<TagContext, 'appId' | 'environment'> => {

    const recordSchema = {
        schema: "iglu:com.mediajel.events/record/jsonschema/1-0-0"
        data: {
            appId: appId,
            cart: environment
        }
    }

    window.tracker('trackSelfDescribingEvent', recordSchema)

}