import path from 'node:path';

import { main } from './generator/index.ts';

await main({
	outputFilePath: path.resolve(import.meta.dirname, 'index.json'),
	htmlFilePattern: path.resolve(import.meta.dirname, 'src', 'spec.*.jsonc'),
	commonAttrsFilePath: path.resolve(import.meta.dirname, 'src', 'spec-common.attributes.jsonc'),
	commonContentsFilePath: path.resolve(import.meta.dirname, 'src', 'spec-common.contents.jsonc'),
	selectorAliasesFilePath: path.resolve(import.meta.dirname, 'src', 'selector-aliases.jsonc'),
	summaryFilePath: path.resolve(import.meta.dirname, 'generator-summary.md'),
});
