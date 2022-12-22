import { rm, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import syncGlob from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const projectRoot = resolve(__dirname, '..', '..', '..');

/**
 * Get `editUrlBase`
 *
 * @returns {Promise<string>}
 */
export async function getEditUrlBase() {
  return (await import(resolve(projectRoot, 'website', 'config.js'))).default.editUrlBase;
}

/**
 * Remove files that are included by the directory
 *
 * @param {string} dirPath
 */
export async function dropFiles(dirPath) {
  const ignoreFileName = ['.gitkeep'];
  const files = await readdir(dirPath);
  await Promise.all(
    files.map(async file => {
      if (ignoreFileName.includes(file)) {
        return;
      }
      const dropFile = resolve(dirPath, file);
      await rm(dropFile);
      console.log(`✔ ${dropFile}`);
    }),
  );
}

/**
 * Async Glob
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export function glob(dir) {
  return new Promise((res, rej) => {
    syncGlob(dir, (err, matches) => {
      if (err) {
        return rej(err);
      }
      res(matches);
    });
  });
}

/**
 * Write file and output log
 *
 * @param {string} filePath
 * @param {string} content
 */
export async function output(filePath, content) {
  await writeFile(filePath, content, { encoding: 'utf-8' });
  console.log(`✨ ${filePath}`);
}
