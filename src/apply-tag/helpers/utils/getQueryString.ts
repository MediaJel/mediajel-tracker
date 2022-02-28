const getQueryString = () => {
  const scripts = document.getElementsByTagName('script');
  const index = scripts.length - 1;
  const myScript = scripts[index];
  const querystring: string = myScript.src.substring(myScript.src.indexOf("?"));

  // Gets the query string from the script tag
  const queryStringResult = new Proxy (new URLSearchParams(querystring), {
    get: (searchParams, prop) => searchParams.get(prop as string),
  })

  return queryStringResult;
}

export default getQueryString;
