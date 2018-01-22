#!/usr/bin/env node

const meow = require('meow');

const { verify, verifyFile } = require('../lib/');
const { standardReporter } = require('../lib/reporter/');

const cli = meow(`
Usage
	$ markuplint <HTML file>
	$ <stdout> | markuplint

Options
	--ruleset,  -r          Ruleset file path.
	--no-color, -c          Output no color.
	--format,   -f FORMAT   Output format. Support "JSON" only. Default "JSON".

	--help,     -h          Show help.
	--version,  -v          Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
`,
	{
		flags: {
			ruleset: {
				type: 'string',
				alias: 'r',
			},
			'no-color': {
				alias: 'c',
			},
			format: {
				alias: 'f',
			},
		},
	}
);

if (cli.flags.v) {
	cli.showVersion();
}

if (cli.flags.h) {
	cli.showHelp();
}

if (cli.input.length) {
	(async () => {
		if (cli.flags.format) {
			const format = cli.flags.format === true ? 'json' : cli.flags.format;
			switch (format.toLowerCase()) {
				case 'json': {
					const out = [];
					for (const filePath of cli.input) {
						const { html, reports } = await verifyFile(filePath, cli.flags.ruleset);
						out.push({
							path: filePath,
							reports,
							raw: html,
						});
					}
					process.stdout.write(JSON.stringify(out, null, 2));
					break;
				}
				default: {
					throw new Error(`Unsupported output format "${cli.flags.format}"`);
				}
			}
		} else {
			for (const filePath of cli.input) {
				const { html, reports } = await verifyFile(filePath, cli.flags.ruleset);
				await standardReporter(filePath, reports, html, !cli.flags.noColor);
			}
			process.stdout.write('🎉 markuplint CLI done.');
		}
	})();
} else {
	stdinStopWhenEmpty();
	const readline = require('readline');
	const { getRuleset } = require('../lib/ruleset');
	const { getRuleModules } = require('../lib/rule');
	const lines = [];
	const reader = readline.createInterface({ input: process.stdin });
	reader.on('line', lines.push);
	reader.on('close', async () => {
		const html = lines.join('\n');
		const ruleset = cli.flags.ruleset || await getRuleset(process.cwd());
		const rules = await getRuleModules();
		const reports = await verify(html, ruleset, rules);
		await standardReporter('STDIN_DATA', reports, html);
	});
}

/** */
function stdinStopWhenEmpty () {
	const id = setImmediate(() => cli.showHelp());
	process.stdin.on('data', () => clearImmediate(id));
}
