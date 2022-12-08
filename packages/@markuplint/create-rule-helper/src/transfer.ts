import fs from 'node:fs/promises';
import path from 'node:path';

import { render } from 'mustache';
import { format } from 'prettier';
import { transpile, ScriptTarget } from 'typescript';

import { fsExists } from './fs-exists';

export async function transfer(
	filePath: string,
	destDir: string,
	replacer: Record<string, string>,
	options?: {
		transpile: boolean;
	},
) {
	const extname = path.extname(filePath);
	const name = path.basename(filePath, extname);
	const contents = await fs.readFile(filePath, { encoding: 'utf-8' });
	let fileName = `${name}${extname}`;

	// Mustache
	let converted = render(contents, replacer);

	// TypeScript transpiles to JS
	if (options?.transpile) {
		fileName = `${name}.js`;
		converted = transpile(
			converted,
			{
				target: ScriptTarget.ESNext,
			},
			filePath,
		);

		// Insert new line before comments and the export keyword
		converted = converted.replace(/(\n)(\s+\/\*\*|export)/g, '$1\n$2');
	}

	// Prettier
	const parser =
		extname === '.md'
			? 'markdown'
			: extname === '.json'
			? 'json'
			: extname === '.ts'
			? options?.transpile
				? 'babel'
				: 'typescript'
			: undefined;
	converted = format(converted, { parser });

	if (!(await fsExists(destDir))) {
		await fs.mkdir(destDir, { recursive: true });
	}

	const dest = path.resolve(destDir, fileName);
	await fs.writeFile(dest, converted, { encoding: 'utf-8' });

	return dest;
}
