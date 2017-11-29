#!/usr/bin/env node

const meow = require('meow');

const { verifyFile } = require('../lib/');

const cli = meow(`
	HELP!
`, {
	flags: {
		// version: {
		// 	type: 'string',
		// 	alias: 'v',
		// },
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
		if (reports.length) {
			console.log(`❌ : ${filePath} [markuplint]`);
			for (const report of reports) {
				console.warn(`\t${filePath}:${report.line}:${report.col} ${report.message} [markuplint]`);
			}
		} else {
			console.log(`✅ : ${filePath} [markuplint]`);
		}
	}

})();
