/**
 * Spec citation monitor (`yarn spec-citations`).
 *
 * A rule's README, source comments and data files cite the specification
 * passage that justifies it. The HTML Living Standard changes every week and
 * nothing else reads the prose a rule quotes, so a rule can keep enforcing a
 * sentence the spec has since reworded or dropped. The tables of how a
 * framework renders a literal (`literalValues`) are read from the framework's
 * code and documentation, which change as often, so they cite both. This script
 * reads every citation, fetches the page, and reports what no longer holds. A scheduled
 * workflow (`.github/workflows/spec-citation-watch.yml`) runs it weekly and
 * opens an Issue; a maintainer decides what follows. Nothing is fixed
 * automatically, and no model is involved: every verdict is a string
 * comparison against the fetched page.
 *
 * The same workflow refreshes the lock (below) through a pull request that
 * names the Issue; merging that pull request is what accepts the changed
 * passages. A pull request that touches the script runs the check read-only.
 *
 * Two kinds of check, which differ in what they need:
 *
 * - Against the page alone: the anchor exists, the quoted text is in the cited
 *   section, the `:~:text=` fragment matches, the cited `§` number is the
 *   section's. These hold on a fresh clone and say the citation is wrong. For a
 *   source file of a framework the anchor is the name of a top-level
 *   declaration, and the quoted text is looked up in that declaration. A text
 *   fragment with no `#fragment` is searched in the whole page, which is how a
 *   passage that no heading anchors is cited. A definition (the first line of the
 *   source file of an element, a role or a property of ARIA) that is cited at an
 *   anchor holding only a few words is reported as `anchor-thin`: it would never
 *   show a change.
 * - Against the lock (`spec-citations.lock.json`): the cited passage is not
 *   the one a maintainer last accepted. The lock stores the text, not only a
 *   hash, so the report can show what changed without a second fetch.
 *
 * Exit codes: 0 nothing to report, 1 findings, 2 only fetch failures. A crash
 * also exits 1, so a caller tells it from findings by whether `--report`
 * produced a file: the report is written once every check has run, and before
 * `--update` touches the lock.
 *
 * Citations are collected from the sources of every package (`src/**.ts`
 * comments), from the rules' READMEs and `schema.json`, from the HTML spec data
 * and from the website's hand-written pages; `discover.ts` lists which files and
 * how each is read. Which hosts are watched is fixed in `collect.ts`: the
 * specifications (WHATWG, W3C, IETF and the others it lists), the documentation
 * sites of the frameworks, and the source files of the listed repositories. A
 * framework that is not in those lists is not monitored, and no check says so.
 *
 * The lock PR's body lists what it adds to and removes from the lock
 * (`lock-changes.ts`), and names the removed sections that a file still cites.
 *
 * The data of `@markuplint/html-spec` is watched as well, and this monitor, which reads the section itself, is what
 * notices that the specification reworded a definition. The first line of each `html-spec/src/spec.*.jsonc` cites the
 * section that defines the element (`definition.ts`), and `coverage.spec.ts` fails for an element of `index.json`
 * whose first line does not name a section that this monitor reads. What nobody writes as a citation is read from
 * `index.json`: the `cite` of an element that has no source file, the obsolete ones (`elements.ts`), and one section
 * for each role and property of ARIA (`aria.ts`).
 */
import type { CollectResult, PageResult } from './types.ts';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { check } from './check.ts';
import { collectAll } from './discover.ts';
import { isCliEntry } from './entry.ts';
import { fetchPages } from './fetch.ts';
import { EMPTY_LOCK, parseLock, serializeLock } from './lockfile.ts';
import { renderReport } from './report.ts';

export type CliOptions = {
	readonly update: boolean;
	readonly help: boolean;
	readonly root: string;
	readonly lock: string;
	readonly report?: string;
	readonly reportFull?: string;
};

export type CliDeps = {
	readonly collect: (root: string) => CollectResult;
	readonly fetchPages: (urls: Iterable<string>) => Promise<Map<string, PageResult>>;
	readonly readText: (path: string) => string | null;
	readonly writeText: (path: string, text: string) => void;
	readonly write: (line: string) => void;
	readonly now: () => string;
};

const USAGE = `Usage: yarn spec-citations [options]

Checks the passages that rules and framework declarations cite against the live specifications,
framework documentation and framework sources.

Options:
  --update              Rewrite the lock file with the sections as they are now
  --report <file>       Write a Markdown report sized for an Issue comment
  --report-full <file>  Write the same report without the size limit
  --lock <file>         Lock file (default: scripts/spec-citations/spec-citations.lock.json)
  --help                Show this help

Exit codes: 0 nothing to report, 1 findings, 2 only fetch failures.
A run that crashes writes no report file; that is how a caller tells a crash from exit code 1.
`;

export function parseCliArgs(argv: readonly string[], root: string): CliOptions {
	const { values } = parseArgs({
		args: [...argv],
		options: {
			update: { type: 'boolean', default: false },
			help: { type: 'boolean', default: false },
			report: { type: 'string' },
			'report-full': { type: 'string' },
			lock: { type: 'string' },
		},
		strict: true,
	});
	return {
		update: values.update,
		help: values.help,
		root,
		lock: values.lock ?? join(root, 'scripts/spec-citations/spec-citations.lock.json').replaceAll('\\', '/'),
		...(values.report === undefined ? {} : { report: values.report }),
		...(values['report-full'] === undefined ? {} : { reportFull: values['report-full'] }),
	};
}

/** Runs the checks and returns the exit code. */
export async function run(options: CliOptions, deps: CliDeps): Promise<number> {
	const collected = deps.collect(options.root);
	const needed = new Set(
		collected.citations
			.filter(c => c.fragment !== null || c.textDirective !== null || c.quotes.length > 0 || c.secno !== null)
			.map(c => c.page),
	);
	const pages = await deps.fetchPages(needed);

	const lockText = deps.readText(options.lock);
	const lock = lockText === null ? EMPTY_LOCK : parseLock(lockText);
	const now = deps.now();
	const { problems, lock: next } = check({ ...collected, pages, lock, now });

	for (const problem of problems) {
		const place = problem.citation ?? problem.quote;
		deps.write(
			`[${problem.kind}] ${place === undefined || place === null ? '' : `${place.file}:${place.line} `}${problem.message}`,
		);
	}

	// The reports come before the lock: a run that fails while rendering leaves no report, which a caller reads as
	// a crash, and must not have changed the lock either.
	const report = renderReport(problems, collected.citations, { date: now.slice(0, 10) });
	if (options.report !== undefined) {
		deps.writeText(options.report, report.summary);
	}
	if (options.reportFull !== undefined) {
		deps.writeText(options.reportFull, report.full);
	}

	if (options.update) {
		const text = serializeLock(next);
		if (text !== (lockText ?? serializeLock(EMPTY_LOCK))) {
			deps.writeText(options.lock, text);
		}
	}
	if (report.findings > 0) {
		return 1;
	}
	return report.failures > 0 ? 2 : 0;
}

export const realDeps: CliDeps = {
	collect: root => collectAll(root),
	fetchPages: urls => fetchPages(urls),
	readText: path => (existsSync(path) ? readFileSync(path, 'utf8') : null),
	writeText: (path, text) => writeFileSync(path, text),
	write: line => process.stdout.write(`${line}\n`),
	now: () => new Date().toISOString(),
};

if (isCliEntry(import.meta.url)) {
	const options = parseCliArgs(process.argv.slice(2), fileURLToPath(new URL('../../', import.meta.url)));
	if (options.help) {
		process.stdout.write(USAGE);
	} else {
		process.exitCode = await run(options, realDeps);
	}
}
