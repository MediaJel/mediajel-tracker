import { ContextArg, ContextInterface } from "../../interface";

// Creates Context object from the first index of the array
// retruned from the scripts that matched our criteria
// based on KeyWords
function createContext(array: ContextArg[]): ContextInterface {
  const { appId, test, environment, retailId, mediajelAppId } = array[0];

  const context: ContextInterface = {
    appId: appId ?? mediajelAppId,
    retailId,
    environment,
    collector: test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
  };

  return context;
}
export { createContext };
