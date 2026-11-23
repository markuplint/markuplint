/**
 * Checks that a reorganization of the rule specs loses no test and flips none.
 *
 * ```sh
 * node --experimental-strip-types scripts/rule-test-ids/verify-equivalence.ts \
 *   --base <ref> [--map scripts/rule-test-ids/id-map.json] \
 *   [--base-report base.json --head-report head.json]
 * ```
 *
 * Why it exists: renaming, renumbering, merging files and unwrapping groups rewrite what a review of the diff
 * reads, and an existing test is a contract (`.claude/rules/spec-files.md`) whose ID is also what the tests of
 * the v6 engine are matched against. A test that vanished or an assertion that flipped unnoticed is a line that
 * passes without the behavior it guards. This is not a licence for such a change: the owner decides whether a
 * test is removed, renumbered or merged, and this shows that nothing else happened.
 *
 * What it does: reads the specs of `packages/@markuplint/rules/src` as they are at `--base` (a git ref, the
 * branch that the work goes to: it differs by release line, so there is no default) and as they are in the
 * working tree, fingerprints every test (`fingerprint.ts`), and fails unless the head holds the tests of the
 * base one for one (`compare.ts`), less the removals and plus the additions that the ID map records.
 *
 * The reports are optional and come in a pair: `vitest run packages/@markuplint/rules --reporter=json
 * --outputFile=<file>`, run once on a checkout of the base and once on the working tree. With them it also
 * checks that every case ran and passed, rule by rule (`cases.ts`), which the fingerprints do not show: a
 * `describe` that no longer collects its tests, or a `test.each` whose table got shorter.
 *
 * The ID map (`id-map.json`, shape in `id-map.ts`; `--map` names another): `removed` lists a test that was
 * deleted because an identical one stays, and `added` a test that was put in because a behavior had none.
 * Both are true only against a base that predates them. Once the base contains them, move the entries under
 * `merged`, which this script does not check, so that the record that the v6 line ports its IDs from is kept
 * and the next run against the new base is not told that a removed test is unknown. `policy` lists specs of
 * the rules that enforce the convention that the reorganization establishes and that the base does not have:
 * their tests and cases are left out of the head, as each would be a test that appeared, and the entry goes
 * with the others once the base has the spec.
 *
 * What it cannot see:
 *
 * - A change inside a module that a spec imports (a helper or a fixture module): an import counts as the
 *   module it names. The same goes for a file on disk that a test reads.
 * - Anything that is not in the text of the test and of what it reads in its own file: mutable state that
 *   several tests share, and globals. The reader is syntactic.
 * - A name or an ID: they are out of the hash on purpose, so a malformed or duplicated ID is the concern of
 *   `src/test-ids.spec.ts` of the rules.
 * - The specs outside the rules' `src` (`renumber.ts` rewrites two of them): only the check of `renumber.ts`
 *   itself stands for them.
 * - How many times a helper that defines tests is called: it is fingerprinted once, so a call that was
 *   removed shows only in the counts of the reports (`cases.ts`), which is why they are worth passing.
 *
 * It refuses, rather than skips, a spec that is not a `*.spec.ts`, and a group whose callback it cannot read.
 *
 * A statement that runs around the tests (`vi.mock`, a hook) is part of the fingerprint of every test it
 * affects, so merging a spec that has one into another changes those tests and is reported.
 *
 * Lifetime: a check of one reorganization, not a standing test. Delete this directory (its specs run in
 * `yarn test` until then) once the v6 line carries the IDs that the map records.
 *
 * @module
 */
import type { CaseReport } from './cases.ts';
import type { Fingerprinted } from './compare.ts';

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { compareCases } from './cases.ts';
import { compare, scopeOf } from './compare.ts';
import { fingerprintSource } from './fingerprint.ts';
import { parseIdMap } from './id-map.ts';

const SRC = 'packages/@markuplint/rules/src';

function git(args: string[]): string {
	// `git ls-tree` over the specs of all rules and the largest spec, as output, are far below this; the
	// default of 1 MiB is not.
	const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
	}
	return result.stdout;
}

function fingerprints(file: string, source: string): Fingerprinted[] {
	return fingerprintSource(file, source).map(test => ({ ...test, scope: scopeOf(file), file }));
}

/**
 * @param names - Paths of the files under the rules' `src`
 * @returns The ones that are specs this script reads (`*.spec.ts`)
 * @throws When there is a spec of another extension, which vitest runs and this would skip without a word
 */
function specsOf(names: readonly string[]): string[] {
	const other = names.find(name => /\.spec\.(?!ts$)[cm]?[jt]sx?$/.test(name));
	if (other) {
		throw new Error(`${other} is a spec that this script does not read: only *.spec.ts files are`);
	}
	return names.filter(name => name.endsWith('.spec.ts'));
}

function readBase(ref: string): Fingerprinted[] {
	const files = specsOf(git(['ls-tree', '-r', '-z', '--name-only', ref, '--', SRC]).split('\0'));
	return files.flatMap(name => fingerprints(name.slice(SRC.length + 1), git(['show', `${ref}:${name}`])));
}

function readHead(): Fingerprinted[] {
	const files = specsOf(
		readdirSync(SRC, { recursive: true, encoding: 'utf8' }).map(name => name.split(path.sep).join('/')),
	).toSorted();
	return files.flatMap(name => fingerprints(name, readFileSync(path.join(SRC, name), 'utf8')));
}

function readJson<T>(file: string): T {
	return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/** The head report without the cases of the specs that the ID map lists under `policy`. */
function withoutPolicy(report: CaseReport, policy: readonly string[]): CaseReport {
	return {
		...report,
		testResults: report.testResults.filter(
			result => !policy.some(file => result.name.replaceAll('\\', '/').endsWith(`/${SRC}/${file}`)),
		),
	};
}

const { values } = parseArgs({
	options: {
		base: { type: 'string' },
		map: { type: 'string' },
		'base-report': { type: 'string' },
		'head-report': { type: 'string' },
	},
});

// The branch that the work goes to differs by release line (`origin/dev`, `origin/v6`), so there is no default.
if (!values.base) {
	throw new Error('--base <ref> is required: the ref of the branch that the work goes to, such as origin/dev');
}

// What `git ls-tree` prints and what `SRC` names are relative to the root: work from there, and read
// the paths that the caller gave against where the caller was.
const given = (file: string | undefined) => (file ? path.resolve(file) : undefined);
// The map next to this script, wherever the caller is.
const mapFile = given(values.map) ?? path.join(import.meta.dirname, 'id-map.json');
const baseReport = given(values['base-report']);
const headReport = given(values['head-report']);
// One report alone would skip the check of the cases without saying so.
if (Boolean(baseReport) !== Boolean(headReport)) {
	throw new Error('--base-report and --head-report go together: pass both, or neither');
}
process.chdir(git(['rev-parse', '--show-toplevel']).trim());

const { removed, added, policy = [] } = parseIdMap(readFileSync(mapFile, 'utf8'));
const base = readBase(values.base);
// The specs that the change adds to enforce its own convention have no counterpart in the base.
const head = readHead().filter(test => !policy.includes(test.file));
// An empty side compares equal to an empty side, which would pass without having read anything.
if (base.length === 0 || head.length === 0) {
	throw new Error(`no tests were read (base: ${base.length}, working tree: ${head.length}) from ${SRC}`);
}

const problems = compare(base, head, removed, added).map(problem => `${problem.kind}: ${problem.message}`);
if (baseReport && headReport) {
	problems.push(
		...compareCases(
			readJson<CaseReport>(baseReport),
			withoutPolicy(readJson<CaseReport>(headReport), policy),
			removed,
			added,
		),
	);
}

process.stdout.write(
	`${values.base}: ${base.length} tests; working tree: ${head.length} tests; removed on purpose: ${removed.length}; added on purpose: ${added.length}\n`,
);
// A run without the reports has not seen whether the tests still run: say so, so that a pass is not read as more.
process.stdout.write(
	baseReport && headReport
		? 'cases: compared with the reports\n'
		: 'cases: not checked (pass --base-report and --head-report to check that every case ran and passed)\n',
);
if (problems.length > 0) {
	process.stderr.write(`${problems.join('\n')}\n`);
	process.exitCode = 1;
} else {
	process.stdout.write('every test of the base is in the working tree, as it was\n');
}
