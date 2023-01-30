import fs from 'fs';
import client from 'https';

class ImageService {
  downloadImage(url: string): Promise<string> {
    if (url === '') return Promise.resolve('');

    return new Promise((resolve, reject) => {
      const filepath = "storage/images/" + url.substring(url.lastIndexOf('/') + 1);
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
}

export default new ImageService();