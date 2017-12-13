#!/usr/bin/env node

const meow = require('meow');

const { verify, verifyFile } = require('../lib/');
const { standardReporter } = require('../lib/reporter/');

const cli = meow(`
	Usage
	  $ markuplint <input>

	Options
	  --ruleset,  -r    Ruleset file path
	  --no-color, -c    output no color

	Examples
	  $ markuplint verifyee.html --ruleset path/to/.markuplintrc
	  $ cat verifyee.html | markuplint
`, {
	flags: {
		ruleset: {
			type: 'string',
			alias: 'r',
		},
		'no-color': {
			alias: 'c',
		},
	},
});

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
			await standardReporter(filePath, reports, html, !cli.flags.noColor);
		}
		console.log(`🎉 markuplint CLI done.`);
	})();
}

else {
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

function stdinStopWhenEmpty () {
	const id = setImmediate(() => cli.showHelp());
	process.stdin.on('data', () => clearImmediate(id));
}
