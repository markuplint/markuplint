import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { projectRoot } from './utils.mjs';

/**
 * Copy Raw Markdown documents to `/docs`
 */
export async function copyRawDocs() {
  await copyFile(
    resolve(projectRoot, 'CONTRIBUTING.md'),
    resolve(projectRoot, 'website', 'community', 'contributing.md'),
  );

  await copyFile(
    resolve(projectRoot, 'CODE_OF_CONDUCT.md'),
    resolve(projectRoot, 'website', 'community', 'code-of-conduct.md'),
  );
}
