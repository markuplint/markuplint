import getStdin from 'get-stdin';
import meow from 'meow';
import { verify } from './verify';
// import ruleModulesLoader from '../rule/loader';
// import createRuleset from '../ruleset/createRuleset';

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
		fix: {
			type: 'boolean',
		},
		format: {
			type: 'string',
			alias: 'f',
		},
		'no-color': {
			type: 'boolean',
			alias: 'c',
		},
		'problem-only': {
			type: 'boolean',
			alias: 'p',
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
	verify(cli.input, cli.flags.fix, cli.flags.format, cli.flags.noColor, cli.flags.problemOnly);
}

getStdin().then(async stdin => {
	const html = stdin;
	if (!html) {
		return;
	}
	// const rules = await ruleModulesLoader();
	// const ruleset = await createRuleset(cli.flags.ruleset || process.cwd(), rules);
	// const reports = await verify(html, ruleset, rules);
	// await output('STDIN_DATA', reports, html, cli.flags);
});
