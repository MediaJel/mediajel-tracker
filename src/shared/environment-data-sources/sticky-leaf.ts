import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const stickyLeafDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  if (!window.location.pathname.includes("checkout")) {
    return;
  }
  const { name } = window["$sl"].cartReview.form;
  const transactionId = `${name} - ${new Date()}`;
  const value = document.getElementById("total");

  transactionEvent({
    id: transactionId,
    total: parseFloat(value.innerText.replace(/^\D+/g, "")),
    tax: 0,
    shipping: 0,
    city: "N/A",
    state: "N/A",
    country: "USA",
    currency: "USD",
    items: [],
  });
};

export default stickyLeafDataSource;
