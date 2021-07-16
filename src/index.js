import Context from "./trackerConfig/context";
import handleTag from "./trackerConfig/handleTag";
import getQueryString from "./trackerConfig/utils/getQueryString.js";

// Gathers all scripts of page
const scripts = document.getElementsByTagName("script");
const context = new Context();

const getAllScripts = Array.from(scripts).filter(
	(raw) => raw.getAttribute("src") !== null
);

const handleScripts = getAllScripts
	.filter((data) => {
		const pixel = data.getAttribute("src");
		return pixel.includes("appId");
	})
	.map((script) => {
		const src = script.getAttribute("src");
		if (src.includes("appId")) {
			const queryString = src.split("?");
			return getQueryString(queryString[1]);
		}
	});

if (handleScripts) {
  context.appId = handleScripts[0].appId;
  context.environment = handleScripts[0].environment.toLowerCase();
  context.retailId = handleScripts[0].retailId.toLowerCase();
  if (handleScripts[0].hasOwnProperty("test")) {
    context.collector = process.env.MJ_STAGING_COLLECTOR_URL;
  } else {
    context.collector = process.env.MJ_PRODUCTION_COLLECTOR_URL;
  }
}

if (context.appId) {
  handleTag(context);
}
