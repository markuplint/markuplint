/**
 * Spec citation monitor (`yarn spec-citations`).
 *
 * A rule's README, source comments and data files cite the specification
 * passage that justifies it. The HTML Living Standard changes every week and
 * nothing else reads the prose a rule quotes, so a rule can keep enforcing a
 * sentence the spec has since reworded or dropped. This script reads every
 * citation, fetches the page, and reports what no longer holds. A scheduled
 * workflow (`.github/workflows/spec-citation-watch.yml`) runs it monthly and
 * opens an Issue; a maintainer decides what follows. Nothing is fixed
 * automatically, and no model is involved: every verdict is a string
 * comparison against the fetched page.
 *
 * Two kinds of check, which differ in what they need:
 *
 * - Against the page alone: the anchor exists, the quoted text is in the cited
 *   section, the `:~:text=` fragment matches, the cited `§` number is the
 *   section's. These hold on a fresh clone and say the citation is wrong.
 * - Against the lock (`spec-citations.lock.json`): the cited passage is not
 *   the one a maintainer last accepted. The lock stores the text, not only a
 *   hash, so the report can show what changed without a second fetch.
 *
 * Exit codes: 0 nothing to report, 1 findings, 2 only fetch failures. A crash
 * also exits 1, so a caller tells it from findings by whether `--report`
 * produced a file: the report is written once every check has run, and before `--update` touches the lock.
 *
 * Citations are collected from the rules package (README, `*.ts` comments,
 * `schema.json`) and from the website's hand-written pages; `discover.ts` lists
 * which files and how each is read.
 */
import type { CollectResult, PageResult } from './types.ts';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { check } from './check.ts';
import { collectFiles, listCitingFiles } from './discover.ts';
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

Checks the specification passages that rules cite against the live specifications.

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
			.filter(c => c.fragment !== null || c.quotes.length > 0 || c.secno !== null)
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

const realDeps: CliDeps = {
	collect: root => collectFiles(root, listCitingFiles(root)),
	fetchPages: urls => fetchPages(urls),
	readText: path => (existsSync(path) ? readFileSync(path, 'utf8') : null),
	writeText: (path, text) => writeFileSync(path, text),
	write: line => process.stdout.write(`${line}\n`),
	now: () => new Date().toISOString(),
};

/** Whether this module was started as `node <this-file>`; comparing URLs through `pathToFileURL` keeps it right on Windows. */
function isCliEntry(importMetaUrl: string): boolean {
	const entry = process.argv[1];
	return entry !== undefined && importMetaUrl === pathToFileURL(entry).href;
}

if (isCliEntry(import.meta.url)) {
	const options = parseCliArgs(process.argv.slice(2), fileURLToPath(new URL('../../', import.meta.url)));
	if (options.help) {
		process.stdout.write(USAGE);
	} else {
		process.exitCode = await run(options, realDeps);
	}
}
