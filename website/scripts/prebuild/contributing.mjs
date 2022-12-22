import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { projectRoot } from './utils.mjs';

/**
 * Copy CONTRIBUTING.md to docs
 */
export async function copyContributing() {
  await copyFile(
    resolve(projectRoot, 'CONTRIBUTING.md'),
    resolve(projectRoot, 'website', 'docs', 'community', 'contributing.md'),
  );
}
