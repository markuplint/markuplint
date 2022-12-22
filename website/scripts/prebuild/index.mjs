import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyContributing } from './contributing.mjs';
import { createRuleDocs } from './rules.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..', '..', '..');

await createRuleDocs(projectRoot);
await copyContributing(projectRoot);
