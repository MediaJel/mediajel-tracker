const fs = require("fs");
const env = require("./deployConfig");

function predeploy() {
  if (fs.existsSync(env.dist_path)) {
    fs.rmdirSync(env.dist_path, { recursive: true }, (err) => {
      if (err) {
        // Do nothing, again.
        console.warn("\x1b[33m", `⚠️ No ${env.dist_path}`, "\x1b[0m");
        console.log("\x1b[36m", "✨ Proceeding with build", "\x1b[0m");
      } else {
        // Deletes files if there are any.
        console.info(
          "\x1b[36m",
          `⚠️ ${env.dist_path} deleted successfully `,
          "\x1b[0m"
        );
        console.log("\x1b[36m", "✨ Proceeding with build", "\x1b[0m");
      }
    });
  } else {
    console.warn("\x1b[33m", `⚠️ Hello! No ${env.dist_path}`, "\x1b[0m");
    console.log("\x1b[36m", "✨ Proceeding with build...", "\x1b[0m");
  }
}

fs.access(env.dist_path, predeploy);
