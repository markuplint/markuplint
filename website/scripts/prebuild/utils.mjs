import { rm, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ignoreFileName = ['.gitkeep'];

/**
 * Remove files that are included by the directory
 *
 * @param {string} dirPath
 */
export async function dropFiles(dirPath) {
  const files = await readdir(dirPath);
  await Promise.all(
    files.map(async file => {
      if (ignoreFileName.includes(file)) {
        return;
      }
      await rm(resolve(dirPath, file));
    }),
  );
}
