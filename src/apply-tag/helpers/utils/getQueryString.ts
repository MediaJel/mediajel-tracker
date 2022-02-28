const getQueryString = (myScript) => {
  const querystring: string = myScript.src.substring(myScript.src.indexOf("?"));
  const params = new URLSearchParams( querystring );
  const queryStringResult: any = Object.fromEntries((params as any).entries());

  // Gets the query string from the script tag
  // const queryStringResult = new Proxy (new URLSearchParams(querystring), {
  //   get: (searchParams, prop) => searchParams.get(prop as string),
  // })

  return queryStringResult;
}

export default getQueryString;
