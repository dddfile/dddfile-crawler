import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import client from 'https';
import path from 'path';

class ImageService {
  private s3client: S3Client;

  constructor() {
    this.s3client = new S3Client({
      endpoint: "https://nyc3.digitaloceanspaces.com",
      forcePathStyle: false, // Configures to use subdomain/virtual calling format.
      region: "us-east-1", // Must be "us-east-1" when creating new Spaces. Otherwise, use the region in your endpoint (e.g. nyc3).
      credentials: {
        accessKeyId: "DO00GB38UU9L93HCRLQG", // Access key pair. You can create access key pairs using the control panel or API.
        secretAccessKey: "OGANTYkAcGwWsoDfCzJSliyKCZvKllFEPHWT2JSZarI" //process.env.SPACES_SECRET + '' // Secret access key defined through an environment variable.
      }
  })
  }
  downloadImage(site: string, url: string): Promise<string> {
    if (url === '') return Promise.resolve('');

    fs.mkdirSync(`storage/${site}/images`, { recursive: true });

    return new Promise((resolve, reject) => {
      const filepath = `storage/${site}/images/` + url.substring(url.lastIndexOf('/') + 1);
      client.get(url, (res) => {
          if (res.statusCode === 200) {
              res.pipe(fs.createWriteStream(filepath))
                  .on('error', reject)
                  .once('close', () => resolve(filepath));
          } else {
              // Consume response data to free up memory
              res.resume();
              reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

          }
      });
    });
  }

  async uploadImageToS3(resourceId: string, filepath: string): Promise<string> {
    if (process.env.NODE_ENV !== 'production') {
      return `${process.env.IMAGE_HOST}/${filepath}`;
    }
    const fileext = path.extname(filepath);
    const fileContent = fs.readFileSync(filepath);
    const params = {
      Bucket: `dddfile-files`,
      Key: `${resourceId}${fileext}`, // Object key, referenced whenever you want to access this file later.
      Body: fileContent,
      ACL: "public-read", // Defines ACL permissions, such as private or public.
      Metadata: { // Defines metadata tags.
        // "x-amz-meta-my-key": "your-value"
      }
    };

    try {
      const data = await this.s3client.send(new PutObjectCommand(params));
      console.log("Successfully uploaded object: " + params.Bucket + "/" + params.Key);
      const endpoint = `${process.env.IMAGE_HOST}/${params.Key}`;
      return endpoint;
    } catch (err) {
      console.log("Error", err);
      throw err;
    }
  }
}

export default new ImageService();