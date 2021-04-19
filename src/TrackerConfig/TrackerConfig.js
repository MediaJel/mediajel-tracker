import { JaneTracker } from '../JaneTracker';

export function setTrackerConfig(aid, env, prod) {
  const col = prod
    ? '//collector.dmp.cnna.io'
    : '//collector.dmp.mediajel.ninja';

  env === 'jane' && JaneTracker(aid, col);
}
