import { SnowplowTracker } from 'src/shared/snowplow/types';

export {default as withSnowplowSegmentsExtension} from './segments';
export {default as withGoogleAdsExtension} from './google-ads';
export {default as withBingAdsExtension} from './bing-ads';
export {default as withDeduplicationExtension} from './deduplicator';

export const applyExtensions = (
  tracker: SnowplowTracker,
  // Either load a function, false, or undefined for dynamic loading
  extensions: ((tracker: SnowplowTracker) => SnowplowTracker)[] | (((tracker: SnowplowTracker) => SnowplowTracker) | false | undefined)[] | undefined
): SnowplowTracker => {
  if (!extensions) return tracker;
  return (extensions as ((tracker: SnowplowTracker) => SnowplowTracker | false | undefined)[]).reduce(
    (currentTracker, extension) => (extension ? (extension as (tracker: SnowplowTracker) => SnowplowTracker)(currentTracker) : currentTracker),
    tracker
  );
};