import Context from "../entities/Context";
import controller from "./tracker-config/controller";

// Gathers all scripts of page

const scripts = document.getElementsByTagName("script");
const context = new Context();

const getAllScripts = Array.from(scripts).filter(
  (raw) => raw.getAttribute("src") !== null
);

const handleScripts = getAllScripts
  .filter((data) => {
    const pixel = data.getAttribute("src");
    return pixel.includes("mediajelAppId");
  })
  .map((script) => {
    const src = script.getAttribute("src");
    if (src.includes("mediajelAppId")) {
      const srcArg = src.split("?");
      const args = srcArg[1];
      return args.split("&");
    }
    return null;
  });

handleScripts[0].map((arg) => {
  const pair = arg.split("=");
  const argName = pair[0];
  const argValue = pair[1];

  switch (argName) {
    case "mediajelAppId":
      context.aid = argValue;
      break;
    case "environment":
      context.env = argValue.toLowerCase();
      break;
    case "test":
      context.col = process.env.MJ_STAGING_COLLECTOR_URL;
      break;
    default:
      console.error("Please provide an App ID!");
      break;
  }
  return null;
});

if (context.aid) {
  controller(context);
}
