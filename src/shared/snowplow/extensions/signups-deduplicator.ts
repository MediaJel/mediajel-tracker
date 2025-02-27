import logger from 'src/shared/logger';

import { SnowplowTracker } from '../types';

/**
 * *This extension will prevent duplicate sign up events from being tracked
 */
const withSignUpDeduplicationExtension = (snowplow: SnowplowTracker) => {
  const trackSignUp = snowplow.trackSignup;

  snowplow.trackSignup = (input) => {
    const signUpStorage = sessionStorage.getItem(snowplow.context.appId);

    if (signUpStorage === input.uuid) {
      return logger.warn(`Sign up with id ${input.uuid} already tracked, Discarding duplicate sign up`);
    }

    trackSignUp(input);
    sessionStorage.setItem(snowplow.context.appId, input.uuid);
  };
  return snowplow;
};

export default withSignUpDeduplicationExtension;
