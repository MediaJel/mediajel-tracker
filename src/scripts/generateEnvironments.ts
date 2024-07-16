import * as fs from 'fs';
import * as path from 'path';
import { S3 } from 'aws-sdk';

require('dotenv').config();

// Configure AWS SDK
const s3 = new S3({
  region: process.env.AWS_REGION_PROD,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_PROD,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_PROD
});

// Path to the index.ts file
const indexPath = path.join(__dirname, '../v1/imports/carts/index.ts');
// Path to the environment.js file
const environmentPath = path.join(__dirname, 'environment.js');

const bucketName = process.env.BUCKET_GENERATE_ENVIRONMENTS_PROD;
const s3Key = 'environments.js'; 

// Function to upload file to S3
const uploadToS3 = (filePath: string, bucket: string, key: string) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading file for upload:', err);
      return;
    }

    const params = {
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: 'application/javascript',
      ACL: 'public-read' 
    };

    s3.upload(params, (s3Err, data) => {
      if (s3Err) {
        console.error('Error uploading file:', s3Err);
        return;
      }
      console.log(`File uploaded successfully at ${data.Location}`);
    });
  });
};

// Read the content of index.ts file
fs.readFile(indexPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading index.ts file:', err);
    return;
  }

   // Regular expression to match case values, descriptions, and events-tracked
   const caseRegex = /case\s+"(.*?)":\s+import\(".*?"\)\.then\(.*?\);\s*\/\/\s*description:\s*"(.*?)"\s*\/\/\s*events-tracked:\s*(\[.*?\])/gs;
   let match;
   const environments = [];
 
   // Extract case values, descriptions, and events-tracked
   while ((match = caseRegex.exec(data)) !== null) {
     const value = match[1];
     const description = match[2];
     const eventsTracked = JSON.parse(match[3].replace(/([\w-]+):/g, '"$1":'));
 
     // Convert to label format (capitalize first letter and replace hyphens with spaces)
     const label = value
       .split('-')
       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
       .join(' ');
 
     environments.push({ label, value, description, eventsTracked });
   }
 

  // Create the formatted string for the environment.js file
  const output = `[\n${environments.map(env => `  {\n    "label": "${env.label}",\n    "value": "${env.value}",\n    "description": "${env.description}",\n    "eventsTracked": ${JSON.stringify(env.eventsTracked, null, 4)}\n  }`).join(',\n')}\n]`;

  // Write the formatted data to environment.js
  fs.writeFile(environmentPath, output, 'utf8', writeErr => {
    if (writeErr) {
      console.error('Error writing environment.js file:', writeErr);
      return;
    }
    console.log('environment.js file created successfully!');

    // Upload the file to S3
    uploadToS3(environmentPath, bucketName, s3Key);
  });
});
