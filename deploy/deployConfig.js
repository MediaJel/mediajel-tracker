const config = {
  access_key: process.env.AWS_ACCESS_KEY_ID,
  secret_key: process.env.AWS_SECRET_ACCESS_KEY,
  s3_bucket: process.env.MJ_TRACKER_AWS_S3_BUCKET,
  cdn_id: process.env.MJ_TRACKER_AWS_CLOUDFRONT_DIST_ID,
  cdn_path: process.env.MJ_TRACKER_AWS_CLOUDFRONT_CDN_PATH,
  dist_path: process.env.MJ_TRACKER_DIST_PATH,
  max_age: process.env.MJ_CACHE_MAX_AGE,
};

module.exports = config;
