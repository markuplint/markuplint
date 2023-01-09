import type { MLFile } from './ml-file/index.mjs';
import type { MLMarkupLanguageParser, ParserOptions } from '@markuplint/ml-ast';
import type { ParserConfig } from '@markuplint/ml-config';

import path from 'path';

import { toRegexp } from './utils.mjs';

const parsers = new Map<string, MLMarkupLanguageParser>();

export async function resolveParser(file: MLFile, parserConfig?: ParserConfig, parserOptions?: ParserOptions) {
	parserConfig = {
		...parserConfig,
		'/\\.html?$/i': '@markuplint/html-parser',
	};
	parserOptions = parserOptions || {};

	let parserModName = '@markuplint/html-parser';
	let matched = false;
	if (parserConfig) {
		for (const pattern of Object.keys(parserConfig)) {
			if (path.basename(file.path).match(toRegexp(pattern))) {
				parserModName = parserConfig[pattern];
				matched = true;
				break;
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
