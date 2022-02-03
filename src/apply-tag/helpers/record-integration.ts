import { TagContext } from '../../shared/types'



const recordIntegration = ({ appId, environment }: Pick<TagContext, 'appId' | 'environment'>) => {

    const recordSchema = {
        schema: "iglu:com.mediajel.events/record/jsonschema/1-0-1",
        data: {
            appId: appId,
            cart: environment
        }
    }

    window.tracker('trackSelfDescribingEvent', recordSchema)

}

export default recordIntegration