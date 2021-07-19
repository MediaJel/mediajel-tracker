import { ContextArg } from "../../interface";

function getQueryString(url: string): ContextArg {
  const result = {};
  const parsedUrl = url;

  const inputData = (key, val) => {
    if (result[key] === undefined) {
      result[key] = val;
    }
  };

  if (!parsedUrl) throw new Error("There is no query.");

  if (parsedUrl.includes("&")) {
    parsedUrl.split("&").forEach((x) => {
      const [param, value] = x.split("=");
      inputData(param, value);
    });
  } else {
    const [param, value] = parsedUrl.split("=");
    inputData(param, value);
  }

  const context: ContextArg = result;

  return context;
}
export { getQueryString };
