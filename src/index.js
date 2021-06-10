import config from './TrackerConfig/Config';
import setTrackerConfig from './TrackerConfig';

// Gathers all scripts of page
const scripts = document.getElementsByTagName('script');
const testCollector = '//collector.dmp.mediajel.ninja';

const getAllScripts = Array.from(scripts).filter(
  (raw) => raw.getAttribute('src') !== null,
);

const handleScripts = getAllScripts
  .filter((data) => {
    const pixel = data.getAttribute('src');
    return pixel.includes('mediajelAppId');
  })
  .map((script) => {
    const src = script.getAttribute('src');
    if (src.includes('mediajelAppId')) {
      const srcArg = src.split('?');
      const args = srcArg[1];
      return args.split('&');
    }
    return null;
  });

// Todo: Assign
handleScripts[0].map((arg) => {
  const pair = arg.split('=');
  const argName = pair[0];
  const argValue = pair[1];

  switch (argName) {
    case 'mediajelAppId':
      config.aid = argValue;
      break;
    case 'environment':
      config.env = argValue.toLowerCase();
      break;
    case 'test':
      config.col = testCollector.toLowerCase();
      break;
    default:
      console.error('Please provide an App ID!');
      break;
  }
  return null;
});

if (config.aid) {
  setTrackerConfig(config);
}
