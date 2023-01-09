import type { CLIOptions } from '../bootstrap.mjs';

import { createRule, MLRule } from '@markuplint/ml-core';

import { command } from '../command.mjs';

export default async function (files: string[], options: CLIOptions, selectors: string) {
	const name = '__CLI_SEARCH__';
	const locations: {
		file: string;
		line: number;
		col: number;
	}[] = [];
	await command(
		files,
		{
			...options,
			problemOnly: true,
			importPresetRules: false,
		},
		{
			rules: [
				new MLRule({
					name,
					...createRule({
						verify({ document }) {
							const nodes = document.querySelectorAll(selectors);
							locations.push(
								...Array.from(nodes).map(node => {
									return {
										file: document.filename || '_NO_FILE_',
										line: node.startLine,
										col: node.startCol,
									};
								}),
							);
						},
					}),
				}),
			],
			config: {
				rules: {
					[name]: true,
				},
			},
		},
	);
	locations.forEach(loc => {
		process.stdout.write(`${loc.file}:${loc.line}:${loc.col}\n`);
	});
}
