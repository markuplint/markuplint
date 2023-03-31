import type { MLFile } from './ml-file';
import type { MLMarkupLanguageParser, ParserOptions } from '@markuplint/ml-ast';
import type { ParserConfig } from '@markuplint/ml-config';

import path from 'path';

import { toRegexp } from './utils';

const parsers = new Map<string, MLMarkupLanguageParser>();

export async function resolveParser(
	file: Readonly<MLFile>,
	parserConfig?: ParserConfig,
	parserOptions?: ParserOptions,
) {
	parserConfig = {
		...parserConfig,
		'/\\.html?$/i': '@markuplint/html-parser',
	};
	parserOptions = parserOptions ?? {};

	let parserModName = '@markuplint/html-parser';
	let matched = false;

	for (const pattern of Object.keys(parserConfig)) {
		if (path.basename(file.path).match(toRegexp(pattern))) {
			const modName = parserConfig[pattern];
			if (!modName) {
				continue;
			}
			parserModName = modName;
			matched = true;
			break;
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
