export const trackSelfDescribingEvent = (schema: string, data: any) => {
  window.tracker("trackSelfDescribingEvent", {
    schema,
    data,
  });
};

export default trackSelfDescribingEvent;
