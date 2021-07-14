export default async function DynamicImport(env) {
  switch (env) {
    case "jane": {
      const { default: func } = await import("../Platforms/Jane");
      func();
      break;
    }
    case "dutchieiframe": {
      const { default: func } = await import("../Platforms/DutchieIframe");
      func();
      break;
    }
    default:
      console.error("Undefined environment");
      break;
  }
}
