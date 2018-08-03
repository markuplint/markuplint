import getStdin from 'get-stdin';
import glob from 'glob';
import meow from 'meow';

// @ts-ignore
import promisify from 'util.promisify';

import { fixFile, verify, verifyFile } from '..';
import { simpleReporter, standardReporter } from '../reporter';

import { VerifiedResult } from '../rule';
import ruleModulesLoader from '../rule/loader';
import createRuleset from '../ruleset/createRuleset';

const asyncGlob: (pattern: string) => Promise<string[]> = promisify(glob);

const help = `
Usage
	$ markuplint <HTML file pathes (glob format)>
	$ <stdout> | markuplint

Options
	--ruleset,      -r FILE_PATH  Ruleset file path.
	--no-color,     -c            Output no color.
	--format,       -f FORMAT     Output format. Support "JSON" or "Simple". Default "JSON".
	--problem-only, -p            Output only problems, without passeds.
	--fix                         Output fixed HTML.

	--help,         -h            Show help.
	--version,      -v            Show version.

Examples
	$ markuplint verifyee.html --ruleset path/to/.markuplintrc
	$ cat verifyee.html | markuplint
`;

const cli = meow(help, {
	flags: {
		ruleset: {
			type: 'string',
			alias: 'r',
		},
		'no-color': {
			type: 'boolean',
			alias: 'c',
		},
		format: {
			type: 'string',
			alias: 'f',
		},
		'problem-only': {
			type: 'boolean',
			alias: 'p',
		},
		fix: {
			type: 'boolean',
		},
	},
});

let exitCode = 0;

if (cli.flags.v) {
	cli.showVersion();
}

if (cli.flags.h) {
	cli.showHelp();
}

if (cli.input.length) {
	(async () => {
		for (const pattern of cli.input) {
			const fileList = await asyncGlob(pattern);
			for (const filePath of fileList) {
				if (cli.flags.fix) {
					const { origin, fixed } = await fixFile(
						filePath,
						void 0,
						cli.flags.ruleset,
					);
					process.stdout.write(fixed);
				} else {
					const { html, reports } = await verifyFile(
						filePath,
						void 0,
						cli.flags.ruleset,
					);
					await output(filePath, reports, html, cli.flags);
				}
			}
		}
		process.exit(exitCode);
	})();
}

getStdin().then(async stdin => {
	const html = stdin;
	if (!html) {
		return;
	}
	const rules = await ruleModulesLoader();
	const ruleset = await createRuleset(
		cli.flags.ruleset || process.cwd(),
		rules,
	);
	const reports = await verify(html, ruleset, rules);
	await output('STDIN_DATA', reports, html, cli.flags);
	process.exit(exitCode);
});

/**
 *
 */
async function output(
	filePath: string,
	reports: VerifiedResult[],
	html: string,
	flags: { [type: string]: string | boolean },
) {
	if (reports.length) exitCode = 1;
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
				throw new Error(
					`Unsupported output format "${cli.flags.format}"`,
				);
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
