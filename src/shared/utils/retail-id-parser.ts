import { pollForElement } from "../sources/utils/poll-for-element";
import { retailIdentifier } from "../types";
/**
 * Dynamically parses a retail ID on the site url by polling for specific elements present on the checkout page.
 * @param {retailIdentifier} retail - The retail identifier object containing the elements to poll.
 * Please use a specific element id on a page to ascertain that the page should have a retail ID.
 * ! If not used correctly, we could append a retail ID to every page.
 * @example
 * const ecommerce = {
 *   id: [
 *     {
 *       retailId: "California",
 *       element: [".ca-element", "#california-element", "[data-state='CA-element']"],
 *       fn: () => { console.log("Retail ID applied for California"); }
 *     },
 *     {
 *       retailId: "New York",
 *       element: [".ny-element", "#ny-element", "[data-state='NY-element']"],
 *       fn: () => { console.log("Retail ID applied for New York"); }
 *     },
 *   ],
 * };
 * createRetailId(ecommerce);
 */
export const createRetailId = (retail: retailIdentifier) => {
  const { id } = retail;

  const parseRetailId = () => {
    id.forEach((retail) => {
      pollForElement(retail.element, () => {
        if (!retail.element) return;
        const baseUrl = window.location.href;
        const url = new URL(baseUrl);
        const urlId = retail.retailId.replace(/\s+/g, "").toLowerCase();
        retail.element.forEach((elementSelector) => {
          const element = document.querySelector(elementSelector);
          if (element) {
            console.log(`Element detected for retail ID "${retail.retailId}": ${elementSelector}`);
          }
        });

        url.searchParams.set("retailId", urlId);
        window.history.replaceState({}, "", url.toString());

        if (retail.fn) {
          retail.fn();
        }
      });
    });
  };

  parseRetailId();

  const checkUrlChange = () => {
    window.navigation.addEventListener("navigate", () => {
      let previousUrl = sessionStorage.getItem("previousUrl");
      const currentUrl = window.location.href;
      sessionStorage.setItem("currentUrl", currentUrl);

      if (currentUrl !== previousUrl) {
        sessionStorage.setItem("previousUrl", currentUrl);
        parseRetailId();
      }
    });
  };

  setInterval(checkUrlChange, 1000);
};
