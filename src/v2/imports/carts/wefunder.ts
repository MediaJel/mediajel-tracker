import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const wefunderTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrResponseSource((xhr) => {
    if (xhr.responseURL.includes("investments") && typeof xhr.responseText === "string") {
      const data = JSON.parse(xhr?.responseText);

      window.tracker("setUserId", data?.investment?.user_id || data?.investment?.investor_name);

      window.tracker("addTrans", {
        orderId: data?.investment?.id.toString(),
        affiliation: retailId ?? appId,
        total: parseFloat(data?.investment?.amount),
        tax: 0,
        shippping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
      });

      window.tracker("trackTrans");
    }
  });
};

export default wefunderTracker;
