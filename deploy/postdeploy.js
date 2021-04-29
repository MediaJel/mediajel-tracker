var awsCli = require('aws-cli-js');
var Options = awsCli.Options;
var Aws = awsCli.Aws;

var options = new Options(
  process.env.AWS_ACCESS_KEY,
  process.env.AWS_SECRET_ACCESS_KEY
);
var aws = new Aws(options);
var path = '../dist';
var bucket = 's3://mediajel-tracker-staging';

aws
  .command(`s3 cp ${path} ${bucket} --recursive`)
  .then((data) => {
    console.log('\x1b[36m', data.raw, '\x1b[0m');
    console.info('\x1b[32m ', '✨ Upload completed!!!', '\x1b[0m');
  })
  .catch((e) => console.warn('\x1b[41m', e, '\x1b[0m'));
