import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const buddiTracker = ({
    appId,
    retailId,
}: Pick<QueryStringContext, "appId" | "retailId">) => {
    xhrSource((req: XMLHttpRequest): void => {
        console.log(req)
    })
};

export default buddiTracker;
