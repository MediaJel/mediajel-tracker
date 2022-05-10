const getQueryString = () => {
  // const scripts = document.getElementsByTagName('script');
  // const index = scripts.length - 1;
  // const myScript = scripts[index];

  const target = document.currentScript as HTMLScriptElement || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const querystring: string = target.src.substring(target.src.indexOf("?"));
  const params = new URLSearchParams( querystring );
  const queryStringResult: any = Object.fromEntries((params as any).entries());

  console.log("queryString: " + querystring);
  console.log("queryStringResult: " + queryStringResult);

  // Gets the query string from the script tag
  // Way more efficient in getting the query string but has issues with key-value pairs appending to objects
  // const queryStringResult = new Proxy (new URLSearchParams(querystring), {
  //   get: (searchParams, prop) => searchParams.get(prop as string),
  // })

  return queryStringResult;
}

export default getQueryString;
