export default async function dynamicImport(appId, environment, retailId) {
  switch (environment) {
    case "jane": {
      const { default: func } = await import("../platforms/jane");
      func(appId, retailId);
      break;
    }
    case "dutchie": {
      const { default: func } = await import("../platforms/dutchie");
      func(appId, retailId);
      break;
    }
    case "meadow": {
      const { default: func } = await import("../platforms/meadow");
      func(appId, retailId);
      break;
    }
    case "tymber": {
      const { default: func } = await import("../platforms/tymber");
      func(appId, retailId);
      break;
    }
    default:
      console.error("Undefined environment");
      break;
  }
}
