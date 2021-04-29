const fs = require('fs');
var path = '../dist';

function predeploy(error) {
  if (error) {
    //Do nothing
    console.warn(`${path} does not exist, proceeding with build`);
  }
  fs.rm(path, { recursive: true }, (err) => {
    if (err) {
      //Do nothing, again.
      console.warn(`No ${path}, proceeding with build`);
    }
    //Deletes files if there are any.
    console.info(`${path} deleted successfully, proceeding with build `);
  });
}

fs.access(path, predeploy);
