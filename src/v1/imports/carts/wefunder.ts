import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const wefunderTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  datalayerSource((data) => {
    console.log(data.event);
    if (data?.event === "conversion") {
      window.tracker(
        "addTrans",
        data?.eventModel?.transaction_id,
        retailId ?? appId,
        parseFloat(data?.eventModel?.value),
        0,
        0,
        "USD"
      );

      window.tracker("trackTrans");
    }
  });
};

export default wefunderTracker;
