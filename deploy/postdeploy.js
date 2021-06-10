require('dotenv').config();
const awsCli = require('aws-cli-js');
const Options = awsCli.Options;
const Aws = awsCli.Aws;

const options = new Options(
	process.env.AWS_ACCESS_KEY,
	process.env.AWS_SECRET_ACCESS_KEY,
);

const aws = new Aws(options);

const bucket = process.env.AWS_S3_BUCKET;
const distId = process.env.AWS_CLOUDFRONT_DIST_ID;
const cdnPath = process.env.AWS_CLOUDFRONT_CDN_PATH;
const path = process.env.DIST_PATH;

(async function () {
	//Upload to S3 bucket
	await aws
		.command(`s3 cp ${path} ${bucket} --recursive`)
		.then((data) => {
			console.log('\x1b[36m', data.raw, '\x1b[0m');
			console.info('\x1b[32m ', '✨ Upload completed!!!', '\x1b[0m');
		})
		.catch((e) => console.warn('\x1b[41m', e, '\x1b[0m'));

	// Invalidation of cache on Cloudfront CDN
	await aws
		.command(
			`cloudfront create-invalidation \ --distribution-id ${distId} \ --paths ${cdnPath}`,
		)
		.then((res) => {
			console.log('\x1b[36m', res, '\x1b[0m');
		})
		.catch((e) => console.warn('\x1b[41m', e, '\x1b[0m'));
})();
