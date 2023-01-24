import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const squareTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  datalayerSource((data) => {});
};

export default squareTracker;
