const fs = require('node:fs');
const zlib = require('node:zlib');

const compressedHtml = Buffer.from(
  fs.readFileSync('index.html.b64', 'utf8').replace(/\s/g, ''),
  'base64'
);

fs.writeFileSync('index.html', zlib.gunzipSync(compressedHtml));
