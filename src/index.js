import config from './TrackerConfig/Config';
import setTrackerConfig from './TrackerConfig';

//Gathers all scripts of page
let scripts = document.getElementsByTagName('script');
let testCollector = '//collector.dmp.mediajel.ninja';

const getAllScripts = Array.from(scripts).filter((raw) => {
  return raw.getAttribute('src') !== null;
});

const handleScripts = getAllScripts
  .filter((data) => {
    let pixel = data.getAttribute('src');
    return pixel.includes('mediajelAppId');
  })
  .map((script) => {
    let src = script.getAttribute('src');
    if (src.includes('mediajelAppId')) {
      let srcArg = src.split('?');
      let args = srcArg[1];
      return args.split('&');
    }
  });

handleScripts[0].map((arg) => {
  let pair = arg.split('=');
  let argName = pair[0];
  let argValue = pair[1];

  switch (argName) {
    case 'mediajelAppId':
      config.aid = argValue;
      break;
    case 'environment':
      config.env = argValue.toLowerCase();
      break;
    case 'test':
      config.col = testCollector;
  }
});

if (config.aid) {
  setTrackerConfig(config);
} else {
  console.error('Please provide an app ID');
}
