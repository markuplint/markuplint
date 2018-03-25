"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const get_stdin_1 = __importDefault(require("get-stdin"));
const meow_1 = __importDefault(require("meow"));
const _1 = require("../");
const _2 = require("../reporter/");
const loader_1 = __importDefault(require("../rule/loader"));
const createRuleset_1 = __importDefault(require("../ruleset/createRuleset"));
const help = `
Usage
	$ markuplint <HTML file>
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
const cli = meow_1.default(help, {
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
if (cli.flags.v) {
    cli.showVersion();
}
if (cli.flags.h) {
    cli.showHelp();
}
if (cli.input.length) {
    (async () => {
        for (const address of cli.input) {
            if (cli.flags.fix) {
                const { origin, fixed } = await _1.fixFile(address, void 0, cli.flags.ruleset);
                process.stdout.write(fixed);
            }
            else {
                const { html, reports } = await _1.verifyFile(address, void 0, cli.flags.ruleset);
                await output(address, reports, html, cli.flags);
            }
        }
    })();
}
get_stdin_1.default().then(async (stdin) => {
    const html = stdin;
    if (!html) {
        return;
    }
    const rules = await loader_1.default();
    const ruleset = await createRuleset_1.default(cli.flags.ruleset || process.cwd(), rules);
    const reports = await _1.verify(html, ruleset, rules);
    await output('STDIN_DATA', reports, html, cli.flags);
});
/**
 *
 */
async function output(filePath, reports, html, flags) {
    if (flags.format) {
        const format = flags.format === true ? 'json' : flags.format;
        switch (format.toLowerCase()) {
            case 'json': {
                process.stdout.write(JSON.stringify(reports, null, 2));
                break;
            }
            case 'simple': {
                await _2.simpleReporter(filePath, reports, html, {
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
    }
    else {
        await _2.standardReporter(filePath, reports, html, {
            color: !flags.noColor,
            noStdOut: false,
            problemOnly: cli.flags.problemOnly,
        });
    }
}
