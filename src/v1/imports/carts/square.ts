import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

/**
 * The Square Tracker relies on the Google Datalayer Source to track events.
 * There is documentation to improve this more since Square exports variables
 * to the window object.
 */
const squareTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  datalayerSource((data) => {
    console.log(data);
  });
};

export default squareTracker;
