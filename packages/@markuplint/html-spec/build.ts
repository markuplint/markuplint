import path from 'node:path';

import { main } from './generator/index.ts';

const { fetchProblems } = await main({
	outputFilePath: path.resolve(import.meta.dirname, 'index.json'),
	htmlFilePattern: path.resolve(import.meta.dirname, 'src', 'spec.*.jsonc'),
	commonAttrsFilePath: path.resolve(import.meta.dirname, 'src', 'spec-common.attributes.jsonc'),
	commonContentsFilePath: path.resolve(import.meta.dirname, 'src', 'spec-common.contents.jsonc'),
	selectorAliasesFilePath: path.resolve(import.meta.dirname, 'src', 'selector-aliases.jsonc'),
	summaryFilePath: path.resolve(import.meta.dirname, 'generator-summary.md'),
});

// The output is written all the same, so that the scheduled workflow can still
// open its PR; the exit code is what makes the run fail where it is noticed.
if (fetchProblems) {
	process.exitCode = 1;
}
