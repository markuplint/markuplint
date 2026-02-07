/**
 * @module cli/search
 *
 * Element search subcommand for the markuplint CLI.
 * Finds lines of code that match the given CSS selectors across the target files
 * and outputs their locations in `file:line:col` format.
 */

import type { CLIOptions } from '../bootstrap.js';

import { createRule, MLRule } from '@markuplint/ml-core';

import { command } from '../command.js';

/**
 * Searches the given files for elements matching a CSS selector and prints their locations.
 *
 * Internally creates a temporary lint rule that uses `document.querySelectorAll`
 * to find matching nodes, then outputs each match as `file:line:col` to stdout.
 *
 * @param files - The file paths (or glob patterns) to search.
 * @param options - CLI options forwarded to the underlying lint command.
 * @param selectors - A CSS selector string to match elements against.
 */
export async function search(files: readonly string[], options: CLIOptions, selectors: string) {
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
								...[...nodes].map(node => {
									return {
										file: document.filename ?? '_NO_FILE_',
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
	for (const loc of locations) {
		process.stdout.write(`${loc.file}:${loc.line}:${loc.col}\n`);
	}
}
