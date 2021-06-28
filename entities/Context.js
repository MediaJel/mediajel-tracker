export default class Context {
  constructor(aid, env, col = process.env.MJ_PRODUCTION_COLLECTOR_URL) {
    this.aid = aid;
    this.env = env;
    this.col = col;
  }
}
