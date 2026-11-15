const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function decodePng(buffer) {
  const chunks = [];
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      chunks.push(data);
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error('The app icon must be an 8-bit RGBA PNG.');
  }

  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let sourceOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset++];
    const row = Buffer.from(raw.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? row[x - 4] : 0;
      const above = previousRow[x];
      const upperLeft = x >= 4 ? previousRow[x - 4] : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + above) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) {
        const estimate = left + above - upperLeft;
        const distanceLeft = Math.abs(estimate - left);
        const distanceAbove = Math.abs(estimate - above);
        const distanceUpperLeft = Math.abs(estimate - upperLeft);
        row[x] = (row[x] + (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft
          ? left
          : distanceAbove <= distanceUpperLeft ? above : upperLeft)) & 255;
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter: ${filter}`);
      }
    }
    row.copy(pixels, y * stride);
    previousRow = row;
  }

  return { width, height, pixels };
}

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

function cropIcon(source) {
  const { width, height, pixels } = decodePng(source);
  const background = pixels.subarray(0, 4);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const different = pixels[offset + 3] > 0 && (
        Math.abs(pixels[offset] - background[0]) > 12 ||
        Math.abs(pixels[offset + 1] - background[1]) > 12 ||
        Math.abs(pixels[offset + 2] - background[2]) > 12
      );
      if (different) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  const padding = 2;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  const size = Math.max(right - left + 1, bottom - top + 1);
  const cropped = Buffer.alloc(size * size * 4, 255);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = left + x;
      const sourceY = top + y;
      if (sourceX < width && sourceY < height) {
        pixels.copy(cropped, (y * size + x) * 4, (sourceY * width + sourceX) * 4, (sourceY * width + sourceX + 1) * 4);
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(Buffer.from([0]), cropped.subarray(y * size * 4, (y + 1) * size * 4));
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function resizePng(source, size) {
  const { width, height, pixels } = decodePng(source);
  const resized = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x * width) / size));
      const sourceY = Math.min(height - 1, Math.floor((y * height) / size));
      const sourceOffset = (sourceY * width + sourceX) * 4;
      pixels.copy(resized, (y * size + x) * 4, sourceOffset, sourceOffset + 4);
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(Buffer.from([0]), resized.subarray(y * size * 4, (y + 1) * size * 4));
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}
function createIconIco(png) {
  const size = png.readUInt32BE(16);
  const directory = Buffer.alloc(22);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt8(size > 255 ? 0 : size, 6);
  directory.writeUInt8(size > 255 ? 0 : size, 7);
  directory.writeUInt16LE(1, 10);
  directory.writeUInt16LE(32, 12);
  directory.writeUInt32LE(png.length, 14);
  directory.writeUInt32LE(22, 18);
  return Buffer.concat([directory, png]);
}

const distDirectory = path.join(__dirname, 'dist');
const iconsDirectory = path.join(__dirname, 'src-tauri', 'icons');
fs.mkdirSync(distDirectory, { recursive: true });
fs.mkdirSync(iconsDirectory, { recursive: true });
fs.copyFileSync(
  path.join(__dirname, 'index.html'),
  path.join(distDirectory, 'index.html')
);

const iconPng = resizePng(
  cropIcon(fs.readFileSync(path.join(iconsDirectory, 'SlowRoads_Logo.png'))),
  128
);
fs.writeFileSync(path.join(iconsDirectory, 'icon.png'), iconPng);
fs.writeFileSync(path.join(iconsDirectory, 'icon.ico'), createIconIco(iconPng));
