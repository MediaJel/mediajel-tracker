import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const magentoTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrResponseSource((xhr) => {
    try {
      const getData = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));

      const products = getData && getData.items;

      if (products !== undefined || products.length !== 0) {
        const dataToJSON = JSON.stringify(getData);
        sessionStorage.setItem("pixelData", dataToJSON);
      }
    } catch (error) {}
  });
  try {
    if (window.location.pathname.includes("/checkout/onepage/success/")) {
      setTimeout(() => {
        const storedData = sessionStorage.getItem("pixelData");
        const retrievedObject = JSON.parse(storedData);
        const productsList = retrievedObject && retrievedObject.items;

        const checkoutSuccessElement = document.querySelector(".checkout-success");
        const orderNumberElement = checkoutSuccessElement.querySelector("span");
        const orderNumber = orderNumberElement.textContent.trim();

        window.tracker(
          "addTrans",
          orderNumber,
          retailId ?? appId,
          parseFloat(retrievedObject.base_grand_total),
          parseFloat(retrievedObject.base_tax_amount) || 0,
          parseFloat(retrievedObject.base_shipping_amount) || 0,
          "N/A",
          "N/A",
          "N/A",
          retrievedObject.quote_currency_code || "USD"
        );

        productsList.forEach((item) => {
          window.tracker(
            "addItem",
            orderNumber,
            item.item_id || "N/A",
            item.name || "N/A",
            "N/A",
            parseFloat(item.price) || 0,
            parseInt(item.qty) || 1,
            retrievedObject.quote_currency_code || "USD"
          );
        });
        window.tracker("trackTrans");

        sessionStorage.setItem("pixelData", "0");
      }, 1000);
    }
  } catch (error) {}
};

export default magentoTracker;
