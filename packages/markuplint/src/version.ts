import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// TODO: Use import attribute in Node.js v22 and v20.10 or later
const pkg = require('../package.json');

export const version: string = pkg.version;
