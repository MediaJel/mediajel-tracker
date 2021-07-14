export default class Context {
  // Todo: add default col to env file
  constructor(aid, env, col = "//collector.dmp.cnna.io") {
    this.aid = aid;
    this.env = env;
    this.col = col;
  }
}
