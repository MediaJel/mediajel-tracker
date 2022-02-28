const getQueryString = () => {
  const querystring: string = (document.currentScript as HTMLScriptElement).src.substring( (document.currentScript as HTMLScriptElement).src.indexOf("?") );
  // const params: URLSearchParams = new URLSearchParams( querystring );
  // const queryStringResult: any = Object.fromEntries((params as URLSearchParams).entries());

  // * More efficient way to get queryStrings
  const queryStringResult = new Proxy (new URLSearchParams(querystring), {
    get: (searchParams, prop) => searchParams.get(prop as string),
  })

  return queryStringResult;
}

export default getQueryString;