import getStdin from 'get-stdin';
import meow from 'meow';

import { verify, verifyFile } from '../';
import {
	simpleReporter,
	standardReporter,
} from '../reporter/';

import { VerifiedResult } from '../rule';
import ruleModulesLoader from '../rule/loader';
import createRuleset from '../ruleset/createRuleset';

const help = `
Usage
	$ markuplint <HTML file>
	$ <stdout> | markuplint

Options
	--ruleset,      -r FILE_PATH  Ruleset file path.
	--no-color,     -c            Output no color.
	--format,       -f FORMAT     Output format. Support "JSON" or "Simple". Default "JSON".
	--problem-only, -p            Output only problems, without passeds.

	--help,         -h            Show help.
	--version,      -v            Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
`;

const cli = meow(
	help,
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
			'problem-only': {
				alias: 'p',
			},
		},
	},
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
			const { html, reports } = await verifyFile(filePath, void 0, cli.flags.ruleset);
			await output(filePath, reports, html, cli.flags);
		}
	})();
}

getStdin().then(async (stdin) => {
	const html = stdin;
	if (!html) {
		return;
	}
	const rules = await ruleModulesLoader();
	const ruleset = await createRuleset(cli.flags.ruleset || process.cwd(), rules);
	const reports = await verify(html, ruleset, rules);
	await output('STDIN_DATA', reports, html, cli.flags);
});

/**
 *
 */
async function output (filePath: string, reports: VerifiedResult[], html: string, flags: { [type: string]: string | boolean }) {
	if (flags.format) {
		const format = flags.format === true ? 'json' : flags.format;
		switch (format.toLowerCase()) {
			case 'json': {
				process.stdout.write(JSON.stringify(reports, null, 2));
				break;
			}
			case 'simple': {
				await simpleReporter(filePath, reports, html, {
					color: !flags.noColor,
					noStdOut: false,
					problemOnly: cli.flags.problemOnly,
				});
				break;
			}
			default: {
				throw new Error(`Unsupported output format "${cli.flags.format}"`);
			}
		}
	} else {
		await standardReporter(filePath, reports, html, {
			color: !flags.noColor,
			noStdOut: false,
			problemOnly: cli.flags.problemOnly,
		});
	}
}
