import type { File } from './types.js';

import { statSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { format } from 'prettier';
import tsc from 'typescript';

import { fsExists } from './fs-exists.js';
import { glob } from './glob.js';

/**
 * Options controlling how scaffold files are transferred to their destination.
 */
type TransferOptions = {
	/** Whether to transpile TypeScript files to JavaScript. */
	readonly transpile?: boolean;
	/** Whether to include test files in the transfer. */
	readonly test?: boolean;
	/** A mapping of placeholder names to replacement values for template substitution. */
	readonly replacer?: Readonly<Record<string, string | void>>;
};

const { transpile, ScriptTarget } = tsc;

/**
 * Transfers scaffold template files from a source directory to a destination directory.
 *
 * Scans all files in `baseDir`, processes each file through template substitution,
 * optional TypeScript-to-JavaScript transpilation, and Prettier formatting, then
 * writes the results to `destDir`.
 *
 * @param scaffoldType - The type of scaffold being transferred ("core", "project", or "package").
 * @param baseDir - The source directory containing scaffold template files.
 * @param destDir - The destination directory where processed files will be written.
 * @param options - Optional settings for transpilation, test inclusion, and placeholder replacement.
 * @returns An array of file metadata for each successfully transferred file.
 */
export async function transfer(
	scaffoldType: 'core' | 'project' | 'package',
	baseDir: string,
	destDir: string,
	options?: TransferOptions,
) {
	const files = await scan(baseDir, destDir);
	const results: File[] = [];
	for (const file of files) {
		const result = await transferFile(scaffoldType, file, options);
		if (result) {
			results.push(result);
		}
	}
	return results;
}

async function transferFile(scaffoldType: 'core' | 'project' | 'package', file: File, options?: TransferOptions) {
	if (!(await fsExists(file.filePath))) {
		return null;
	}

	if (file.test && !options?.test) {
		return null;
	}

	let contents = await fs.readFile(file.filePath, { encoding: 'utf8' });

	if (options?.replacer) {
		for (const [before, after] of Object.entries(options?.replacer)) {
			if (!after) {
				continue;
			}
			// Hyphenation to camel-case for variables
			// `rule-name` => `ruleName`
			contents = contents.replaceAll(
				new RegExp(`__${before}__c`, 'g'),
				// Camelize
				after.replaceAll(/-+([a-z])/gi, (_, $1) => $1.toUpperCase()).replace(/^[a-z]/, $0 => $0.toLowerCase()),
			);
			contents = contents.replaceAll(new RegExp(`__${before}__`, 'g'), after);
		}
	}

	// Remove prettier ignore comment
	contents = contents.replace(/\n\s*\/\/ prettier-ignore/, '');
	contents = contents.replace(/\n\s*<!-- prettier-ignore(?:-(?:start|end))? -->/, '');

	const newFile = { ...file };

	// TypeScript transpiles to JS
	if (newFile.ext === '.ts' && options?.transpile) {
		newFile.ext = '.js';
		contents = transpile(
			contents,
			{
				target: ScriptTarget.ESNext,
			},
			newFile.filePath,
		);

		// Insert new line before comments and the export keyword
		contents = contents.replaceAll(/(\n)(\s+\/\*\*|export)/g, '$1\n$2');
	}

	const candidateName = options?.replacer?.[newFile.name.replaceAll('_', '')];
	if (candidateName) {
		newFile.name = candidateName;
		newFile.fileName = candidateName + (newFile.test ? '.spec' : '');
	}

	const dest = path.resolve(newFile.destDir, newFile.fileName + newFile.ext);

	// Prettier
	const parser =
		newFile.ext === '.md'
			? 'markdown'
			: newFile.ext === '.json'
				? 'json'
				: newFile.ext === '.ts'
					? options?.transpile
						? 'babel'
						: 'typescript'
					: undefined;
	contents = await format(contents, { parser, filepath: dest });

	if (!(await fsExists(newFile.destDir))) {
		await fs.mkdir(newFile.destDir, { recursive: true });
	}

	await fs.writeFile(dest, contents, { encoding: 'utf8' });

	return newFile;
}

async function scan(baseDir: string, destDir: string) {
	const fileList = await glob(path.resolve(baseDir, '**', '*'));

	const destList = fileList
		.map(filePath => {
			const stat = statSync(filePath);
			if (!stat.isFile()) {
				return null;
			}
			const relPath = path.relative(baseDir, filePath);
			const destPath = path.resolve(destDir, relPath);
			const ext = path.extname(destPath);
			const fileName = path.basename(destPath, ext);
			const test = path.extname(fileName) === '.spec';
			const name = path.basename(fileName, '.spec');
			const destFileDir = path.dirname(destPath);
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
