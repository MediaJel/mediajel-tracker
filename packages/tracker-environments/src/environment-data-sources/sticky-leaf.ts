import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { EnvironmentEvents } from "@mediajel/tracker-core/types";

const stickyLeafDataSource = () => {
  if (!window.location.pathname.includes("checkout")) {
    return;
  }
  try {
    const name = window["$sl"]?.cartReview?.form?.name;
    const transactionId = `${name} - ${new Date()}`;
    const value = document.getElementById("total")?.innerText;

    observable.notify({
      transactionEvent: {
        id: transactionId,
        total: parseFloat(value?.replace(/^\D+/g, "") ?? ""),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "USA",
        currency: "USD",
        items: [],
      },
    });
  } catch (error) {
    // window.tracker("trackError", JSON.stringify(error), "STICKYLEAF");
  }
};

export default stickyLeafDataSource;
