import setTrackerConfig from './TrackerConfig';
import config from './TrackerConfig/Config';
let scripts = document.getElementsByTagName('script');

const scriptArgs = Array.from(scripts).map((script) => {
  let src = script.getAttribute('src');
  let srcArg = src.split('?');
  let args = srcArg[1];
  return args.split('&');
});

scriptArgs[0].map((arg) => {
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
      config.col = '//collector.dmp.mediajel.ninja';
  }
});

if (config.aid) {
  setTrackerConfig(config);
} else {
  console.error('Please provide an app ID');
}
