const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createIconPng() {
  const size = 32;
  const pixels = [];
  for (let y = 0; y < size; y += 1) {
    pixels.push(0);
    for (let x = 0; x < size; x += 1) {
      const road = x >= 10 + y / 8 && x < 22 - y / 8;
      pixels.push(road ? 235 : 31, road ? 238 : 92, road ? 241 : 160, 255);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(6, 9);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.from(pixels))),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createIconIco(png) {
  const directory = Buffer.alloc(22);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt8(32, 6);
  directory.writeUInt8(32, 7);
  directory.writeUInt16LE(1, 10);
  directory.writeUInt16LE(32, 12);
  directory.writeUInt32LE(png.length, 14);
  directory.writeUInt32LE(22, 18);
  return Buffer.concat([directory, png]);
}

const compressedHtml = Buffer.from(
  fs.readFileSync(path.join(__dirname, 'index.html.b64'), 'utf8').replace(/\s/g, ''),
  'base64'
);

const distDirectory = path.join(__dirname, 'dist');
const iconsDirectory = path.join(__dirname, 'src-tauri', 'icons');
fs.mkdirSync(distDirectory, { recursive: true });
fs.mkdirSync(iconsDirectory, { recursive: true });
fs.writeFileSync(path.join(distDirectory, 'index.html'), zlib.gunzipSync(compressedHtml));

const iconPng = createIconPng();
fs.writeFileSync(path.join(iconsDirectory, 'icon.png'), iconPng);
fs.writeFileSync(path.join(iconsDirectory, 'icon.ico'), createIconIco(iconPng));
