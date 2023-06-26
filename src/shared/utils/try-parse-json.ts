export const tryParseJSONObject = (e: string): string | any => {
  try {
    if (e && typeof e === "object") {
      return e;
    }
  } catch (e) {}

  return JSON.parse(e);
};
