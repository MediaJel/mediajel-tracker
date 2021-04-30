//Tracker Config types
import Pageview from './Types/Pageview';
//Utility functions
import DynamicImport from './Utils/DynamicImport';

export default function setTrackerConfig({ aid, env, col }) {
  Pageview(aid, col);

  if (env) {
    DynamicImport(env);
  }
}
