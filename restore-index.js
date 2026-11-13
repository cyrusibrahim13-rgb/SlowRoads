const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const compressedHtml = Buffer.from(
  fs.readFileSync(path.join(__dirname, 'index.html.b64'), 'utf8').replace(/\s/g, ''),
  'base64'
);

const distDirectory = path.join(__dirname, 'dist');
fs.mkdirSync(distDirectory, { recursive: true });
fs.writeFileSync(path.join(distDirectory, 'index.html'), zlib.gunzipSync(compressedHtml));
