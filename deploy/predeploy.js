const fs = require('fs');
require('dotenv').config();
const path = process.env.DIST_PATH;

function predeploy() {
	fs.rm(path, { recursive: true }, (err) => {
		if (err) {
			//Do nothing, again.
			console.warn('\x1b[33m', `⚠️ No ${path}`, '\x1b[0m');
			console.log('\x1b[36m', '✨ Proceeding with build', '\x1b[0m');
		} else {
			//Deletes files if there are any.
			console.info('\x1b[36m', `⚠️ ${path} deleted successfully `, '\x1b[0m');
			console.log('\x1b[36m', '✨ Proceeding with build', '\x1b[0m');
		}
	});
}

fs.access(path, predeploy);
