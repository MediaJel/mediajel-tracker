import logger from "@mediajel/tracker-core/logger";
import { guard } from "@mediajel/tracker-core/utils/guard";

export const datalayerSource = (callback: (data: any) => void, dataLayer: any = window.dataLayer || []): void => {
  // dataLayer is optional second param to handle dispense cart;
  if (!dataLayer || typeof dataLayer.push !== 'function') {
    logger.error('dataLayer.push is not a function');
    return;
  }

  const safeCallback = guard(callback, "datalayer");
  // The host's dataLayer is shared: null, primitives and functions can be pushed
  // onto it. Every consumer reads a property first, so drop those entries here
  // instead of letting each cart throw (and report) on them.
  const deliver = (data: unknown): void => {
    if (data === null || typeof data !== "object") return;
    safeCallback(data);
  };

  dataLayer.forEach(deliver);

  const originalPush = dataLayer.push.bind(dataLayer);
  dataLayer.push = (...args: any): void => {
    originalPush(...args);
    deliver(dataLayer.slice(-1)[0]); // Gets the newest array member of dataLayer
  };
};
