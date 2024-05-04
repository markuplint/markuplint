import type { MLFile } from './ml-file/index.js';
import type { MLMarkupLanguageParser, MLParser, MLParserModule, ParserOptions } from '@markuplint/ml-ast';
import type { ParserConfig } from '@markuplint/ml-config';

import path from 'node:path';

import { generalImport } from './general-import.js';
import { toRegexp } from './utils.js';

const parsers = new Map<string, MLParser | MLMarkupLanguageParser>();

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
		// eslint-disable-next-line unicorn/prefer-regexp-test
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

async function importParser(parserModName: string): Promise<MLParser | MLMarkupLanguageParser> {
	const entity = parsers.get(parserModName);
	if (entity) {
		return entity;
	}
	const parserMod = await generalImport<MLParserModule | MLMarkupLanguageParser>(parserModName);

	if (!parserMod) {
		throw new Error(`Parser module "${parserModName}" is not found.`);
	}

	// TODO: To be dropped in v5
	if (!('parser' in parserMod)) {
		return parserMod;
	}

	return parserMod.parser;
}
