export default class Context {
  // Todo: add default col to env file
  constructor(appId, environment, collector, retailId) {
    this.appId = appId;
    this.environment = environment;
    this.collector = collector;
    this.retailId = retailId;
  }
}