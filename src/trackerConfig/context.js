export default class Context {
  // Todo: add default col to env file
  constructor(appId, environment, collector = "//collector.dmp.cnna.io", tr_af = appId) {
    this.appId = appId;
    this.environment = environment;
    this.collector = collector;
    this.tr_af = tr_af;
  }
}