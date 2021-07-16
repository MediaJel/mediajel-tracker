export default async function dynamicImport(environment) {
  switch (environment) {
    case "jane": {
      const { default: func } = await import("../platforms/jane");
      func();
      break;
    }
    case "dutchieSubdomain": {
      const { default: func } = await import("../platforms/dutchieSubdomain");
      func();
      break;
    }
    case "meadow": {
      const { default: func } = await import("../platforms/meadow");
      func();
      break;
    }
    case "tymber": {
      const { default: func } = await import("../platforms/tymber");
      func();
      break;
    }
    default:
      console.error("Undefined environment");
      break;
  }
}
