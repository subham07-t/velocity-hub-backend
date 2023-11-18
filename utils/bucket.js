const { digitalOceanBucketConfig } = require("../config/digitalOceanBucket");

const AWS = require("aws-sdk");

const spacesEndpoint = new AWS.Endpoint(
  digitalOceanBucketConfig.spacesEndpoint
);
const accessKeyId = digitalOceanBucketConfig.accessKeyId;
const secretAccessKey = digitalOceanBucketConfig.secretAccessKey;

module.exports.uploadToBucket = async (fileName, pdfBuffer) => {
  // Create an S3 client
  const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  });

  const pdfData = Buffer.from(pdfBuffer, "base64");

  return new Promise((resolve, reject) => {
    // Set the Space name and the file name
    const params = {
      Bucket: digitalOceanBucketConfig.bucketName,
      Key: fileName,
      Body: pdfData,
      ACL: "public-read",
    };

    // Upload the file to DigitalOcean Space
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
