import { ContextArg, ContextInterface } from "../../interface";

// Creates Context object from the first index of the array
// retruned from the scripts that matched our criteria
// based on KeyWords
function createContext(array: ContextArg[]): ContextInterface {
  const { appId, test, environment, retailId, mediajelAppId, client } = array[0];

  const context: ContextInterface = {
    appId: appId ?? mediajelAppId,
    retailId,
    client: client ? client.toLowerCase() : null,
    environment: environment ? environment.toLowerCase() : null,
    collector: test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
  };

  return context;
}
export { createContext };
