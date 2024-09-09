export const datalayerSource = (callback: (data: any) => void, dataLayer: any = window.dataLayer || []): void => {
  // dataLayer is optional second param to handle dispense cart;
  if (!dataLayer || typeof dataLayer.push !== 'function') {
    console.error('dataLayer.push is not a function');
    return;
  }
  const originalPush = dataLayer.push;
  dataLayer.push = (...args: any): void => {
    originalPush(...args);
    callback(dataLayer.slice(-1)[0]); // Gets the newest array member of dataLayer
  };
};
