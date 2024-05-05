import { copyRawDocs } from './copy-raw-docs.mjs';
import { getContributors } from './get-contributors.mjs';
import { createRuleDocs } from './rules.mjs';

await createRuleDocs();
await copyRawDocs();
await getContributors();
