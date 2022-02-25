/**
 * When this is being run, the document's last element will be this very script.
 * Explanations on http://feather.elektrum.org/book/src.html
 */
// var scripts = document.getElementsByTagName('script');
// var index = scripts.length - 1;
// var myScript = scripts[index];
  // document.currentScript.src will be this file's URL, including its query string.
  // e.g. file:///mytests/querystring.js?foo=script

/**
* Now just turn the query string (if any) into a URLSearchParams
to let us easily check values.
*/
var querystring = (document.currentScript).src.substring( (document.currentScript).src.indexOf("?") );
var urlParams = new URLSearchParams( querystring );

const queryStringResult = Object.fromEntries(urlParams.entries()); // Array [ "bar", "bar2" ]
// const proxyUrlParams = new Proxy (new URLSearchParams(querystring), {
//   get: (searchParams, prop) => searchParams.get(prop),
// })
console.log(queryStringResult);
// console.log(proxyUrlParams);

// const object = Object.assign({}, proxyUrlParams);
// console.log(object.appId);

const contextObject = {...queryStringResult,
  appId: queryStringResult.appId ?? queryStringResult.mediajelAppId,
  version: queryStringResult.version ?? "latest",
  collector: queryStringResult.test
    ? true
    : false
  };

delete contextObject.mediajelAppId && delete contextObject.test;

// type QueryStringParams = {
//   appId ?: String;
//   retailId ?: String;
//   environment ?: String;
//   test ?: String;
//   event ?: String;
//   emailAddress ?: String;
// }

// const proxyContextObject = {
//   appId: (proxyUrlParams).appId,
//   retailId: (proxyUrlParams).retailId,
//   environment: (proxyUrlParams).environment,
//   collector: (proxyUrlParams).test ? true : false,
//   event: (proxyUrlParams).event,
//   emailAddress: (proxyUrlParams).emailAddress,
// }

console.log(contextObject);
// console.log(proxyContextObject);