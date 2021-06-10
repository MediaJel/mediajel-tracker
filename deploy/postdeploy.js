const awsCli = require('aws-cli-js');
const env = require('./config');

const { Options, Aws } = awsCli;

const options = new Options(env.access_key, env.secret_key);
const aws = new Aws(options);

(async function () {
	//Upload to S3 bucket
	await aws
		.command(`s3 cp ${env.dist_path} ${env.s3_bucket} --recursive`)
		.then((data) => {
			console.log('\x1b[36m', data.raw, '\x1b[0m');
			console.info('\x1b[32m ', '✨ Upload completed!!!', '\x1b[0m');
		})
		.catch((e) => console.warn('\x1b[41m', e, '\x1b[0m'));

	// Invalidation of cache on Cloudfront CDN
	await aws
		.command(
			`cloudfront create-invalidation \ --distribution-id ${env.cdn_id} \ --paths ${env.cdn_path}`,
		)
		.then((res) => {
			console.log('\x1b[36m', res, '\x1b[0m');
		})
		.catch((e) => console.warn('\x1b[41m', e, '\x1b[0m'));
})();
