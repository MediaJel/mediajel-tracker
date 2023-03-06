import { ImpressionsMacrosParams } from "../../../shared/types";



const mantis = ({
    insertionOrder,
    creativeId,
    clickId,
    publisherId,
    lineItemId,
    publisherName,
}: Partial<ImpressionsMacrosParams>) => {
    const unstruct = {
        schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-2",
        data: {
            insertionOrder: insertionOrder || "N/A",
            lineItemId: lineItemId || "Mantis_Main",
            creativeId: creativeId || "N/A",
            publisherId: publisherId || "N/A",
            publisherName: publisherName || "N/A",
            clickId: clickId || "N/A",
        },
    };





    window.tracker("enableLinkClickTracking", null, false, false, [unstruct]); // Do not change the order of the array

}


export default mantis