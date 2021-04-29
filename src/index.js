import setTrackerConfig from './TrackerConfig';

//Identifiers &  variables
let scripts = document.getElementsByTagName('script');
let mediajelAppId = null;
let environment = null;
let production = true;

//Loops over all scripts & collects scripts with arguments.
for (let i = 0, len = scripts.length; i < len; i++) {
  let src = scripts[i].getAttribute('src');
  //Checks for scripts containing mediajelAppId
  if (src.includes('mediajelAppId')) {
    let srcArg = src.split('?');
    let args = srcArg[1];
    let argv = args.split('&');
    //Loops over all results & collects value of argument "mediajelAppId"
    for (let j = 0, argc = argv.length; j < argc; j++) {
      let pair = argv[j].split('=');
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
    }
  }

  if (!src) {
    continue;
  }
}

if (mediajelAppId) {
  setTrackerConfig(mediajelAppId, environment, production);
} else {
  console.error('Please provide an app ID');
}
