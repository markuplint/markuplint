import type { File } from './types';

import { statSync } from 'node:fs';
import fs from 'node:fs/promises';
import { resolve, extname, basename, relative, dirname } from 'node:path';

import { format } from 'prettier';
import { transpile, ScriptTarget } from 'typescript';

import { fsExists } from './fs-exists';
import glob from './glob';

type TransferOptions = {
	transpile?: boolean;
	test?: boolean;
	replacer?: Record<string, string | void>;
};

export async function transfer(baseDir: string, destDir: string, options?: TransferOptions) {
	const files = await scan(baseDir, destDir);
	const results: File[] = [];
	for (const file of files) {
		const result = await transferFile(file, options);
		if (result) {
			results.push(result);
		}
	}
	return results;
}

async function transferFile(file: File, options?: TransferOptions) {
	if (!(await fsExists(file.filePath))) {
		return null;
	}

	if (file.test && !options?.test) {
		return null;
	}

	let contents = await fs.readFile(file.filePath, { encoding: 'utf-8' });

	if (options?.replacer) {
		Object.entries(options?.replacer).forEach(([before, after]) => {
			if (!after) {
				return;
			}
			contents = contents.replace(new RegExp(`__${before}__`, 'g'), after);
		});
	}

	// TypeScript transpiles to JS
	if (file.ext === '.ts' && options?.transpile) {
		file.ext = '.js';
		contents = transpile(
			contents,
			{
				target: ScriptTarget.ESNext,
			},
			file.filePath,
		);

		// Insert new line before comments and the export keyword
		contents = contents.replace(/(\n)(\s+\/\*\*|export)/g, '$1\n$2');
	}

	const candidateName = options?.replacer?.[file.name.replace(/_/g, '')];
	if (candidateName) {
		file.name = candidateName;
		file.fileName = candidateName + (file.test ? '.spec' : '');
	}

	const dest = resolve(file.destDir, file.fileName + file.ext);

	// Prettier
	const parser =
		file.ext === '.md'
			? 'markdown'
			: file.ext === '.json'
			? 'json'
			: file.ext === '.ts'
			? options?.transpile
				? 'babel'
				: 'typescript'
			: undefined;
	contents = format(contents, { parser, filepath: dest });

	if (!(await fsExists(file.destDir))) {
		await fs.mkdir(file.destDir, { recursive: true });
	}

	await fs.writeFile(dest, contents, { encoding: 'utf-8' });

	return file;
}

async function scan(baseDir: string, destDir: string) {
	const fileList = await glob(resolve(baseDir, '**', '*'));

	const destList = fileList
		.map(filePath => {
			const stat = statSync(filePath);
			if (!stat.isFile()) {
				return null;
			}
			const relPath = relative(baseDir, filePath);
			const destPath = resolve(destDir, relPath);
			const ext = extname(destPath);
			const fileName = basename(destPath, ext);
			const test = extname(fileName) === '.spec';
			const name = basename(fileName, '.spec');
			const destFileDir = dirname(destPath);
			return {
				ext,
				fileName,
				name,
				test,
				destDir: destFileDir,
				filePath,
			};
		})
		.filter((f): f is File => !!f);

	return destList;
}
