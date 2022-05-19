export const tryParseJSONObject = (str: string) => {
  try {
    const o = JSON.parse(str);
    if (o && typeof o === "object") {
      return o;
    }
  }
  catch (e) { }

  return str;
};