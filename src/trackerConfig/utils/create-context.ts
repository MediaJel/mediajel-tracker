import { ContextArg, ContextInterface } from "../../interface";
export default function createContext(array: ContextArg[]): ContextInterface {
  const { appId, test, environment, retailId } = array[0];

  const context: ContextInterface = {
    appId,
    retailId,
    environment,
    collector: test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
  };

  return context;
}
