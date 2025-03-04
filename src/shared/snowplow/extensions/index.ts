import { SnowplowTracker } from 'src/shared/snowplow/types';

export {default as withSnowplowSegmentsExtension} from './segments';
export {default as withGoogleAdsExtension} from './google-ads';
export {default as withBingAdsExtension} from './bing-ads';
export {default as withDeduplicationExtension} from './deduplicator';

export const applyExtensions = (
  tracker: SnowplowTracker,
  // Either load a function or undefined for dynamic loading
  extensions: ((tracker: SnowplowTracker) => SnowplowTracker)[] | undefined
): SnowplowTracker => {
  return extensions.reduce((currentTracker, extension) => extension ? extension(currentTracker): currentTracker, tracker);
};