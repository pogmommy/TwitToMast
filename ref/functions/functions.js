const fs = require('fs');
const client = require('https');
var { tall } = require('tall')

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        client.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
}

async function expandUrl(shortUrl) {
    try {
        const unshortenedUrl = await tall(shortUrl);
        return unshortenedUrl;
    } catch (err) {
        console.error('Error unshortening url: ', err)
        return "";
    }
  }

function rand(min, max) {
    return Math.floor(
      Math.random() * (max - min + 1) + min
    )
}

module.exports = { downloadImage,expandUrl,rand };





