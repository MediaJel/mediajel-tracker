
const utmPersist = () => {
  const parsedHashUrl = location.hash.replace("#", "?").replace("/?", ""); // Remove invalid characters from hash
  const params = new URLSearchParams(location.search || parsedHashUrl); // Check for either search URL or hashed url
  const utmParams = [];

  params.forEach((value, key) => {
    key.startsWith("utm_") && utmParams.push(key + "=" + value);
  });

  const utmParamsString = utmParams.join("&");

  const anchors: NodeListOf<HTMLAnchorElement> = document.querySelectorAll("a[href]")

  anchors.forEach(function (ele ,  idx) {
    const redirectUrl = ele.href.indexOf("?") === -1 ? "?" : "&";
    const redirectUrlWithUtm = ele.href + redirectUrl + utmParamsString;
    ele.href = redirectUrlWithUtm;
  });

  const handleHashChange = () => {
    if (utmParamsString) {
      sessionStorage.setItem("mj_utm_storage", utmParamsString); // Add utm_params to storage
    }

    const checkUtmParams = window.setInterval(() => {
      if (location.href.includes("utm_")) {
        window.clearInterval(checkUtmParams);
        return;
      }

      const storedUtm = sessionStorage.mj_utm_storage || null;

      if (storedUtm) location.replace(location.href + "?" + storedUtm);
    }, 100);
  };

  window.addEventListener("hashchange", handleHashChange);
}