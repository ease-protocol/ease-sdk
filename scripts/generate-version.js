// scripts/generate-version.js
const { version } = require('../package.json');
require('fs').writeFileSync('src/version.ts', `export const SDK_VERSION='${version}';\n`);
