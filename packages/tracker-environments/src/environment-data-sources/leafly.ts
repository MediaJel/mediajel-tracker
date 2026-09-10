import logger from "@mediajel/tracker-core/logger";
import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";

import { pollForElement } from "@mediajel/tracker-core/sources/utils/poll-for-element";
import { isTrackerLoaded } from "@mediajel/tracker-core/sources/utils/is-tracker-loaded";
import { queryText } from "@mediajel/tracker-core/utils/safe-dom";

const leaflyDataSource = () => {
  //TODO: Research on identifying per advertiser on leafly
  try {
    // The shared poller guards its callback. A private unguarded interval here
    // never reached clearInterval when notify threw, so it rethrew onto the
    // client page every 100ms forever and nothing was reported.
    const elements = ["div.jsx-1636262898.content.open p.font-bold.mt-md", ".price .font-bold.text-md"];

    pollForElement(elements, () => {
      if (window.location.href.includes("/order-status")) {
        var id = queryText("div.jsx-1636262898.content.open p.font-bold.mt-md").match(/#(\d+)/)?.[1] ?? "N/A";
        var total = queryText(".price .font-bold.text-md").replace("$", "");

        isTrackerLoaded(() => {
          observable.notify({
            transactionEvent: {
              id: id.toString(),
              total: parseFloat(total) || 0,
              tax: 0,
              shipping: 0,
              city: "N/A",
              state: "N/A",
              country: "N/A",
              currency: "USD",
              items: [],
            },
          });
        });
      }
    });
  } catch (error) {
    logger.info("trackError", JSON.stringify(error), "LEAFLY");
    notifyError(error, "leafly");
  }
};

export default leaflyDataSource;
