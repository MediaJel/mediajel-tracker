export default class Context {
  // Todo: add default col to env file
  constructor(appId, environment, collector = "//collector.dmp.cnna.io") {
    this.appId = appId;
    this.environment = environment;
    this.collector = collector;
  }
}