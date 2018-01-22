#!/usr/bin/env node

const meow = require('meow');
const getStdin = require('get-stdin');

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
		for (const filePath of cli.input) {
			const { html, reports } = await verifyFile(filePath, cli.flags.ruleset);
			await output(filePath, reports, html, cli.flags);
		}
	})();
}

getStdin().then(async (stdin) => {
	const Ruleset = require('../lib/ruleset').default;
	const { getRuleModules } = require('../lib/rule');
	const html = stdin;
	const rules = await getRuleModules();
	const ruleset = await Ruleset.create(cli.flags.ruleset || process.cwd(), rules);
	const reports = await verify(html, ruleset, rules);
	await output('STDIN_DATA', reports, html, cli.flags);
});

/**
 *
 */
async function output (filePath, reports, html, flags) {
	if (flags.format) {
		const format = flags.format === true ? 'json' : flags.format;
		switch (format.toLowerCase()) {
			case 'json': {
				process.stdout.write(JSON.stringify(reports, null, 2));
				break;
			}
			default: {
				throw new Error(`Unsupported output format "${cli.flags.format}"`);
			}
		}
	} else {
		await standardReporter(filePath, reports, html, !flags.noColor);
	}
}


// } else {
// stdinStopWhenEmpty();
// const readline = require('readline');
// const { getRuleset } = require('../lib/ruleset');
// const { getRuleModules } = require('../lib/rule');
// const lines = [];
// const reader = readline.createInterface({ input: process.stdin });
// reader.on('line', lines.push);
// reader.on('close', async () => {
// 	const html = lines.join('\n');
// 	const ruleset = cli.flags.ruleset || await getRuleset(process.cwd());
// 	const rules = await getRuleModules();
// 	const reports = await verify(html, ruleset, rules);
// 	await standardReporter('STDIN_DATA', reports, html);
// });
// }

// /** */
// function stdinStopWhenEmpty () {
// 	const id = setImmediate(() => cli.showHelp());
// 	process.stdin.on('data', () => clearImmediate(id));
// }
