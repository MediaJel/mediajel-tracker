export const datalayerSource = (callback: (data: any) => void, layer: any = window.dataLayer || []): void => {
  // dataLayer is optional second param to handle dispense cart;
  const originalPush = layer.push;

  // Process any existing items in the dataLayer
  if (layer && layer.length > 0) {
    layer.forEach((item: any) => {
      callback(item);
    });
  }

  layer.push = (...args: any): void => {
    originalPush(...args);
    callback(layer.slice(-1)[0]); // Gets the newest array member of dataLayer
  };
};
