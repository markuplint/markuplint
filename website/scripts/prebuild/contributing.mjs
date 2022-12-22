import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Copy CONTRIBUTING.md to docs
 *
 * @param {string} projectRoot
 */
export async function copyContributing(projectRoot) {
  await copyFile(
    resolve(projectRoot, 'CONTRIBUTING.md'),
    resolve(projectRoot, 'website', 'docs', 'community', 'contributing.md'),
  );
}
