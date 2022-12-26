import { statSync } from 'node:fs';
import { rm, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  return (await import(pathToFileURL(resolve(projectRoot, 'website', 'config.js')))).default.editUrlBase;
}

/**
 * Remove files that are included by the directory
 *
 * @param {string} dirPath
 * @param {string} placeholder
 */
export async function dropFiles(dirPath, placeholder) {
  const ignoreFileName = ['.gitkeep'];

  /**
   * @type {string[]}
   */
  const dirList = [];

  if (placeholder) {
    const [above, below] = dirPath.split(`${sep}${placeholder}${sep}`);
    const contents = await readdir(above);

    const dirs = contents
      .filter(content => statSync(resolve(above, content)).isDirectory())
      .map(dir => resolve(above, dir, below));
    dirList.push(...dirs);
  } else {
    dirList.push(dirPath);
  }

  const contents = (
    await Promise.all(
      dirList.map(async dir => {
        const files = await readdir(dir);
        return files.map(file => resolve(dir, file));
      }),
    )
  ).flat();

  await Promise.all(
    contents.map(async content => {
      if (ignoreFileName.includes(basename(content))) {
        return;
      }

      const s = statSync(content);
      if (!s.isFile()) {
        return;
      }

      const dropFile = resolve(dirPath, content);

      await rm(dropFile);
      console.log(`✔ ${dropFile}`);
    }),
  );
}

/**
 * Import JSON
 *
 * @param {string} filePath
 * @returns {Promise<Object>}
 */
export async function importJSON(filePath) {
  const { default: data } = await import(pathToFileURL(filePath), { assert: { type: 'json' } });
  return data;
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
