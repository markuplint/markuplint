import { copyContributing } from './contributing.mjs';
import { getContributors } from './get-contributors.mjs';
import { createRuleDocs } from './rules.mjs';

await createRuleDocs();
await copyContributing();
await getContributors();
