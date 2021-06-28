import Pageview from "./Types/Pageview";
import DynamicImport from "./Utils/DynamicImport";

export default function controller({ aid, env, col }) {
  Pageview(aid, col);
  if (env) {
    DynamicImport(env);
  }
}
