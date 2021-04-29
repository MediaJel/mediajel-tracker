//Tracker Config types
import Pageview from './Config/Pageview';
//Utility functions
import DynamicImport from './Utils/DynamicImport';

export default function setTrackerConfig(aid, env, prod) {
  const col = prod
    ? '//collector.dmp.cnna.io'
    : '//collector.dmp.mediajel.ninja';

  aid && Pageview(aid, col);

  if (env) {
    DynamicImport(env);
  }
}
