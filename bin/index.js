#!/usr/bin/env node

const meow = require('meow');

const { verifyFile } = require('../lib/');
const { standardReporter } = require('../lib/reporter/');

const cli = meow(`
	Usage
	  $ markuplint <input>

	Options
	  --ruleset, -r    Ruleset file path

	Examples
	  $ markuplint verifyee.html --ruleset path/to/.markuplintrc
`, {
	flags: {
		ruleset: {
			type: 'string',
			alias: 'r',
		},
	},
});

if (cli.flags.v) {
	cli.showVersion();
}

if (cli.flags.h) {
	cli.showHelp();
}

(async () => {

	for (const filePath of cli.input) {
		const reports = await verifyFile(filePath, cli.flags.ruleset);
		await standardReporter(filePath, reports);
	}

	console.log(`🎉 markuplint CLI done.`);

})();
