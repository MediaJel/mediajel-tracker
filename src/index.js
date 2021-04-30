import setTrackerConfig from './TrackerConfig';

//Identifiers &  variables
let scripts = document.getElementsByTagName('script');
let mediajelAppId = null;
let environment = null;
let production = true;

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
      mediajelAppId = argValue;
      break;
    case 'environment':
      environment = argValue.toLowerCase();
      break;
    case 'test':
      production = false;
  }
});

if (mediajelAppId) {
  setTrackerConfig(mediajelAppId, environment, production);
} else {
  console.error('Please provide an app ID');
}
