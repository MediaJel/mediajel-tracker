//Func. Config
import { Pageview } from './Config/Pageview';

//Env config
import { JaneTracker } from './JaneTracker/JaneTracker';

export function setTrackerConfig(aid, env, prod) {
  const col = prod
    ? '//collector.dmp.cnna.io'
    : '//collector.dmp.mediajel.ninja';

  //Func. Config - General config on functions here
  //Pageview - Pre-requisite for any form of tracking
  aid && Pageview(aid, col);

  //Env Config - All Config on specific environments here
  env === 'jane' && JaneTracker(aid);
}
