
const fs = require('node:fs');
const path = require('node:path');

const distDirectory = path.join(__dirname, 'dist');

fs.mkdirSync(distDirectory, { recursive: true });

fs.copyFileSync(
  path.join(__dirname, 'index.html'),
  path.join(distDirectory, 'index.html')
);

console.log('Website restored successfully. Existing app icons preserved.');
