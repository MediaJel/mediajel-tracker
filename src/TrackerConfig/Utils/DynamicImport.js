export default async function dynamicImport(environment) {
  console.log(`Importing ${environment}...`);
  switch (environment) {
    case "jane":
      const { default: func } = await import("../platforms/jane");
      func();
      break;
    case "dutchie":
      const { default: func } = await import("../platforms/DutchieIframe");
      func();
      break;
    case "meadow":
      const { default: func } = await import("../platforms/meadow");
      func();
      break;
    default:
      console.error("Undefined environment");
      break;
  }
}
