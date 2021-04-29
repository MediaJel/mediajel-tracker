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
    console.log(data.raw);
    console.info('Upload completed!!!');
  })
  .catch((e) => console.log(e));
