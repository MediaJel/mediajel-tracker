
export const datalayerSource = (callback: (data: any) => void): void => {
    const dataLayer = window.dataLayer || [];
    const originalPush = dataLayer.push
    dataLayer.push = (...args: any): void => {
        originalPush(...args);
        callback(dataLayer.slice(-1)[0]);  // Gets the newest array member of dataLayer
    }
}