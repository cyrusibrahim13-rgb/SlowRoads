const fs = require('node:fs');
const path = require('node:path');
function createIconIco(png) {
  const directory = Buffer.alloc(22);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt8(153, 6);
  directory.writeUInt8(153, 7);
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

const iconPng = fs.readFileSync(path.join(iconsDirectory, 'SlowRoads_Logo.png'));
fs.writeFileSync(path.join(iconsDirectory, 'icon.png'), iconPng);
fs.writeFileSync(path.join(iconsDirectory, 'icon.ico'), createIconIco(iconPng));
