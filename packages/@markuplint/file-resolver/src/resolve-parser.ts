import type { MLFile } from './ml-file';
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import type { ParserConfig, ParserOptions } from '@markuplint/ml-config';

import path from 'path';

import { toRegxp } from '@markuplint/ml-config';

const parsers = new Map<string, MLMarkupLanguageParser>();

export async function resolveParser(file: MLFile, parserConfig?: ParserConfig, parserOptions?: ParserOptions) {
	parserOptions = parserOptions || {};

	let parserModName = '@markuplint/html-parser';
	let matched = false;
	if (parserConfig) {
		for (const pattern of Object.keys(parserConfig)) {
			if (path.basename(file.path).match(toRegxp(pattern))) {
				parserModName = parserConfig[pattern];
				matched = true;
			}
		}
	}
	const parser = await importParser(parserModName);

	return {
		parserModName,
		parser,
		parserOptions,
		matched,
	};
}

async function importParser(parserModName: string) {
	const entity = parsers.get(parserModName);
	if (entity) {
		return entity;
	}
	const parser: MLMarkupLanguageParser = await import(parserModName);
	return parser;
}
