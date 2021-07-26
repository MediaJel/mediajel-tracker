// Keywords as criteria to get URL element
const keyWords: string[] = [
  process.env.MJ_PRODUCTION_S3_LINK,
  process.env.MJ_STAGING_S3_LINK,
  process.env.MJ_PROUCTION_CLOUDFRONT_LINK,
  process.env.MJ_STAGING_CLOUDFRONT_LINK,
  process.env.MJ_LOCAL_DEVELOPMENT_URL,
];

export { keyWords };
