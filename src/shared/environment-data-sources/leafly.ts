import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { pollForElement } from "../sources/utils/poll-for-element";

const leaflyDataSource = () => {
  //TODO: Research on identifying per advertiser on leafly
  try {
    const isTrackerLoaded = (callback) => {
      const intervalId = setInterval(() => {
        if (window.tracker) {
          callback();
          clearInterval(intervalId);
        }
      }, 100);
    };

    const elements = ["div.jsx-1636262898.content.open p.font-bold.mt-md", ".price .font-bold.text-md"];

    pollForElement(elements, () => {
      if (window.location.href.includes("/order-status")) {
        const idElement = document.querySelector("div.jsx-1636262898.content.open p.font-bold.mt-md");
        const totalElement = document.querySelector(".price .font-bold.text-md");

        var id = idElement.textContent.match(/#(\d+)/)[1];
        var total = totalElement.textContent.replace("$", "");

        isTrackerLoaded(() => {
          observable.notify({
            enhancedTransactionEvent: {
              ids: [id.toString()],
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
  }
};

export default leaflyDataSource;
