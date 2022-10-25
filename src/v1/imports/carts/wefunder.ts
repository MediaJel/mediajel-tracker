import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const wefunderTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrSource((xhr) => {
    console.log("XHR" + xhr.responseURL);
    if (xhr.responseURL.includes("confirmation")) {
      const data = JSON.parse(xhr?.responseText);

      window.tracker("setUserId", data?.current_user?.email || data?.investment?.investor?.name);

      window.tracker(
        "addTrans",
        data?.investment?.id.toString(),
        retailId ?? appId,
        parseFloat(data?.investment?.amount),
        0,
        0
      );

      window.tracker("trackTrans");
    }
  });
};

export default wefunderTracker;
