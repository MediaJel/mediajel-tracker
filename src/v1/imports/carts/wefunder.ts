import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const wefunderTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrSource((xhr) => {
    if (xhr.responseURL.includes("investments") && typeof xhr.responseText === "string") {
      const data = JSON.parse(xhr?.responseText);

      window.tracker("setUserId", data?.investment?.user_id || data?.investment?.investor_name);

      window.tracker(
        "addTrans",
        data?.investment?.id.toString(),
        retailId ?? appId,
        parseFloat(data?.investment?.amount),
        0,
        0,
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      window.tracker("trackTrans");
    }
  });
};

export default wefunderTracker;
