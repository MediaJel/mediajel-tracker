import logger from "src/shared/logger";
import { guard } from "src/shared/utils/guard";

export const datalayerSource = (callback: (data: any) => void, dataLayer: any = window.dataLayer || []): void => {
  // dataLayer is optional second param to handle dispense cart;
  if (!dataLayer || typeof dataLayer.push !== 'function') {
    logger.error('dataLayer.push is not a function');
    return;
  }

  const safeCallback = guard(callback, "datalayer");

  dataLayer.forEach((data) => {
    safeCallback(data);
  });

  const originalPush = dataLayer.push.bind(dataLayer);;
  dataLayer.push = (...args: any): void => {
    originalPush(...args);
    safeCallback(dataLayer.slice(-1)[0]); // Gets the newest array member of dataLayer
  };
};
