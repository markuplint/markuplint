import { copyContributing } from './contributing.mjs';
import { createRuleDocs } from './rules.mjs';

await createRuleDocs();
await copyContributing();
