import type { CLIOptions } from '../bootstrap.js';

import { command } from '../command.js';

export async function search(files: readonly string[], options: CLIOptions, selectors: string) {
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
		},
		// No rule is wanted here: the document is what is read, and the rules of the config are neither
		// run nor reported as not found.
		{ noRules: true },
		(engine, file) => {
			// Asked of the engine, which answers for whichever one linted the file: the Rust one has no `Document`.
			for (const { line, col } of engine.searchNodes(selectors)) {
				locations.push({ file, line, col });
			}
		},
	);
	for (const loc of locations) {
		process.stdout.write(`${loc.file}:${loc.line}:${loc.col}\n`);
	}
}
