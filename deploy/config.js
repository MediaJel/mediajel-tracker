require('dotenv').config();
const config = {
	access_key: process.env.AWS_ACCESS_KEY,
	secret_key: process.env.AWS_SECRET_ACCESS_KEY,
	s3_bucket: process.env.AWS_S3_BUCKET,
	cdn_id: process.env.AWS_CLOUDFRONT_DIST_ID,
	cdn_path: process.env.AWS_CLOUDFRONT_CDN_PATH,
	dist_path: process.env.DIST_PATH,
};

module.exports = config;
