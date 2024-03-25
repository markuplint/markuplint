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
 */
export async function getEditUrlBase(): Promise<string> {
  // eslint-disable-next-line unicorn/no-await-expression-member
  return (await import(pathToFileURL(resolve(projectRoot, 'website', 'config.js')).toString())).default.editUrlBase;
}

/**
 * Remove files that are included by the directory
 */
export async function dropFiles(dirPath: string, placeholder?: string): Promise<void> {
  const ignoreFileName = new Set(['.gitkeep']);
  const dirList: string[] = [];

  if (placeholder) {
    const [above, below] = dirPath.split(`${sep}${placeholder}${sep}`);
    if (!above || !below) {
      throw new Error(`Invalid path: ${dirPath}`);
    }
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
  )
    // eslint-disable-next-line unicorn/no-await-expression-member
    .flat();

  await Promise.all(
    contents.map(async content => {
      if (ignoreFileName.has(basename(content))) {
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
 * Import other file
 */
export async function importFileData(filePath: string): Promise<any> {
  const { default: data } = await import(
    pathToFileURL(filePath).toString(),
    filePath.endsWith('json') ? { assert: { type: 'json' } } : undefined
  );
  return data;
}

/**
 * Async Glob
 */
export function glob(dir: string): Promise<string[]> {
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
 */
export async function output(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, { encoding: 'utf8' });
  console.log(`✨ ${filePath}`);
}
