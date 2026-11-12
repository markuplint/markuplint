import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MLEngine } from '../api/index.js';

import { cli } from './bootstrap.js';
import { command } from './command.js';

const targetFile = path.resolve(import.meta.dirname, '../../test/suppressions/target.html');

describe('command: DOM retention for suppressions scope', { timeout: 30_000 }, () => {
	let tmpDir: string;
	let suppressionsFile: string;
	let documentGetter: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-command-test-'));
		suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');
		// What the CLI reads of the document is its nodes, whichever engine linted it
		// (the Rust engine has no `document`).
		documentGetter = vi.spyOn(MLEngine.prototype, 'positionedNodes');
		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	const run = (flags: Record<string, unknown> = {}) =>
		command([targetFile], {
			...cli.flags,
			format: 'json',
			suppressionsLocation: suppressionsFile,
			...flags,
		} as Parameters<typeof command>[1]);

	const reportedRuleIds = () => {
		const written = vi.mocked(process.stdout.write).mock.calls.map(([chunk]) => String(chunk));
		const violations = JSON.parse(written.join('')) as { ruleId: string }[];
		return violations.map(v => v.ruleId).toSorted();
	};

	test('[command-retention-001] a plain run without a suppressions file does not read the document', async () => {
		await run();
		expect(reportedRuleIds()).toStrictEqual(['case-sensitive-attr-name', 'no-duplicate-attr', 'no-duplicate-attr']);
		expect(documentGetter).not.toHaveBeenCalled();
	});

	test('[command-retention-002] an empty suppressions file does not read the document', async () => {
		await fs.writeFile(suppressionsFile, '{}', 'utf8');
		await run();
		expect(documentGetter).not.toHaveBeenCalled();
	});

	test('[command-retention-003] a non-empty suppressions file reads the document', async () => {
		const relPath = path.relative(tmpDir, targetFile).split(path.sep).join('/');
		await fs.writeFile(
			suppressionsFile,
			JSON.stringify({ [relPath]: { 'no-duplicate-attr': { count: 2 } } }),
			'utf8',
		);
		await run();
		expect(reportedRuleIds()).toStrictEqual(['case-sensitive-attr-name']);
		expect(documentGetter).toHaveBeenCalled();
	});

	test('[command-retention-006] an unparsable suppressions file still fails the run', async () => {
		await fs.writeFile(suppressionsFile, '{ not json', 'utf8');
		await expect(run()).rejects.toThrow('Failed to parse suppressions file');
	});

	test('[command-retention-004] suppress mode reads the document', async () => {
		await run({ suppress: true });
		expect(documentGetter).toHaveBeenCalled();
	});

	test('[command-retention-005] prune mode does not read the document', async () => {
		const relPath = path.relative(tmpDir, targetFile).split(path.sep).join('/');
		await fs.writeFile(
			suppressionsFile,
			JSON.stringify({ [relPath]: { 'no-duplicate-attr': { count: 2 } } }),
			'utf8',
		);
		await run({ pruneSuppressions: true });
		expect(documentGetter).not.toHaveBeenCalled();
	});
});

describe('command: the exit decision does not depend on --format', { timeout: 30_000 }, () => {
	const fixtureDir = path.resolve(import.meta.dirname, '../../test/exit-code');
	const fragmentFile = path.join(fixtureDir, 'fragment.html');
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-command-exit-code-'));
		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	const run = (config: string, flags: Record<string, unknown>) =>
		command([fragmentFile], {
			...cli.flags,
			config: path.join(fixtureDir, config),
			searchConfig: false,
			suppressionsLocation: path.join(tmpDir, 'markuplint-suppressions.json'),
			...flags,
		} as Parameters<typeof command>[1]);

	const rows = [
		['001', 'standard', 'no violations', 'clean.json', {}, 'success'],
		['002', 'standard', 'warnings only', 'warning.json', {}, 'success'],
		['003', 'standard', 'warnings with --no-allow-warnings', 'warning.json', { allowWarnings: false }, 'failure'],
		['004', 'standard', 'warnings over --max-warnings', 'warning.json', { maxWarnings: 0 }, 'failure'],
		['005', 'standard', 'warnings at --max-warnings', 'warning.json', { maxWarnings: 1 }, 'success'],
		['006', 'standard', 'errors', 'error.json', {}, 'failure'],
		['007', 'standard', 'errors within --max-warnings', 'error.json', { maxWarnings: 100 }, 'failure'],
		['008', 'simple', 'no violations', 'clean.json', {}, 'success'],
		['009', 'simple', 'warnings only', 'warning.json', {}, 'success'],
		['010', 'simple', 'warnings with --no-allow-warnings', 'warning.json', { allowWarnings: false }, 'failure'],
		['011', 'simple', 'warnings over --max-warnings', 'warning.json', { maxWarnings: 0 }, 'failure'],
		['012', 'simple', 'warnings at --max-warnings', 'warning.json', { maxWarnings: 1 }, 'success'],
		['013', 'simple', 'errors', 'error.json', {}, 'failure'],
		['014', 'simple', 'errors within --max-warnings', 'error.json', { maxWarnings: 100 }, 'failure'],
		['015', 'github', 'no violations', 'clean.json', {}, 'success'],
		['016', 'github', 'warnings only', 'warning.json', {}, 'success'],
		['017', 'github', 'warnings with --no-allow-warnings', 'warning.json', { allowWarnings: false }, 'failure'],
		['018', 'github', 'warnings over --max-warnings', 'warning.json', { maxWarnings: 0 }, 'failure'],
		['019', 'github', 'warnings at --max-warnings', 'warning.json', { maxWarnings: 1 }, 'success'],
		['020', 'github', 'errors', 'error.json', {}, 'failure'],
		['021', 'github', 'errors within --max-warnings', 'error.json', { maxWarnings: 100 }, 'failure'],
		['022', 'json', 'no violations', 'clean.json', {}, 'success'],
		['023', 'json', 'warnings only', 'warning.json', {}, 'success'],
		['024', 'json', 'warnings with --no-allow-warnings', 'warning.json', { allowWarnings: false }, 'failure'],
		['025', 'json', 'warnings over --max-warnings', 'warning.json', { maxWarnings: 0 }, 'failure'],
		['026', 'json', 'warnings at --max-warnings', 'warning.json', { maxWarnings: 1 }, 'success'],
		['027', 'json', 'errors', 'error.json', {}, 'failure'],
		['028', 'json', 'errors within --max-warnings', 'error.json', { maxWarnings: 100 }, 'failure'],
	] as const;

	for (const [id, format, name, config, flags, decision] of rows) {
		test(`[command-exit-code-${id}] ${name} with --format ${format}: run ${decision}`, async () => {
			expect(await run(config, { ...flags, format })).toBe(decision === 'failure');
		});
	}

	test('[command-exit-code-029] --format json fails on errors left after suppressions are applied', async () => {
		const relPath = path.relative(tmpDir, fragmentFile).split(path.sep).join('/');
		await fs.writeFile(
			path.join(tmpDir, 'markuplint-suppressions.json'),
			JSON.stringify({ [relPath]: { 'no-duplicate-attr': { count: 1 } } }),
			'utf8',
		);
		expect(await run('error.json', { format: 'json' })).toBe(true);
	});

	test('[command-exit-code-030] --format json succeeds when suppressions cover every error', async () => {
		const relPath = path.relative(tmpDir, fragmentFile).split(path.sep).join('/');
		await fs.writeFile(
			path.join(tmpDir, 'markuplint-suppressions.json'),
			JSON.stringify({ [relPath]: { 'no-hardcoded-id': { count: 1 } } }),
			'utf8',
		);
		expect(await run('error.json', { format: 'json' })).toBe(false);
	});

	// `progressiveOutput` defaults to true, so the table above covers the
	// progressive path of the text formats; these cover the batch path.
	test('[command-exit-code-031] errors with --no-progressive-output --format standard: run failure', async () => {
		expect(await run('error.json', { format: 'standard', progressiveOutput: false })).toBe(true);
	});

	test('[command-exit-code-032] no violations with --no-progressive-output --format standard: run success', async () => {
		expect(await run('clean.json', { format: 'standard', progressiveOutput: false })).toBe(false);
	});

	test('[command-exit-code-033] errors in source code from stdin with --format json: run failure', async () => {
		const result = await command([{ sourceCode: '<div id="fixed">Fragment</div>\n' }], {
			...cli.flags,
			config: path.join(fixtureDir, 'error.json'),
			searchConfig: false,
			ignoreExt: true,
			suppressionsLocation: path.join(tmpDir, 'markuplint-suppressions.json'),
			format: 'json',
		} as Parameters<typeof command>[1]);
		expect(result).toBe(true);
	});
});

/**
 * What the `--max-count` and suppressions specs below share: a temp directory
 * for the suppressions file, the stdout / stderr spies, and the fixtures in
 * `test/max-count/`.
 *
 * - `a.html`: a `no-hardcoded-id` error and a `no-duplicate-attr` warning.
 * - `b.html`: two `no-hardcoded-id` errors.
 * - `warning-only.html`: one `no-duplicate-attr` warning.
 *
 * `[command-max-count-013]` pins the order the engine reports `a.html`'s two
 * violations in, which the `--max-count=1` specs depend on.
 */
function useCommandFixture(tmpPrefix: string) {
	const fixtureDir = path.resolve(import.meta.dirname, '../../test/max-count');
	const fx = {
		/** Set before each spec. */
		tmpDir: '',
		/** Set before each spec. */
		suppressionsFile: '',
		fileA: path.join(fixtureDir, 'a.html'),
		fileB: path.join(fixtureDir, 'b.html'),
		fileW: path.join(fixtureDir, 'warning-only.html'),
		config: path.join(fixtureDir, 'config.json'),
		/** The config of `exclude-b.json` excludes `b.html`; the glob is relative to the config's directory. */
		configExcludingB: path.join(fixtureDir, 'exclude-b.json'),
		relPath: (file: string) => path.relative(fx.tmpDir, file).split(path.sep).join('/'),
		run: (files: readonly string[], flags: Record<string, unknown> = {}) =>
			command([...files], {
				...cli.flags,
				config: fx.config,
				searchConfig: false,
				suppressionsLocation: fx.suppressionsFile,
				format: 'json',
				...flags,
			} as Parameters<typeof command>[1]),
		stdout: () =>
			vi
				.mocked(process.stdout.write)
				.mock.calls.map(([chunk]) => String(chunk))
				.join(''),
		stderr: () =>
			vi
				.mocked(process.stderr.write)
				.mock.calls.map(([chunk]) => String(chunk))
				.join(''),
		/** `[file name, rule ID]` of every violation `--format json` printed. */
		reported: () =>
			(JSON.parse(fx.stdout()) as { ruleId: string; filePath: string }[]).map(v => [
				path.basename(v.filePath),
				v.ruleId,
			]),
	};

	beforeEach(async () => {
		fx.tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), tmpPrefix));
		fx.suppressionsFile = path.join(fx.tmpDir, 'markuplint-suppressions.json');
		vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(fx.tmpDir, { recursive: true, force: true });
	});

	return fx;
}

describe('command: --max-count does not change what the run decides', { timeout: 30_000 }, () => {
	const fx = useCommandFixture('markuplint-command-max-count-');
	const { fileA, fileB, fileW, relPath, run, stderr, reported } = fx;

	const writeSuppressions = (data: Record<string, Record<string, { count: number }>>) =>
		fs.writeFile(fx.suppressionsFile, JSON.stringify(data), 'utf8');

	test('[command-max-count-001] without a suppressions file the hidden error still fails the run', async () => {
		expect(await run([fileA], { maxCount: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['a.html', 'no-duplicate-attr']]);
	});

	test('[command-max-count-002] a suppressions file that suppresses nothing does not change the verdict', async () => {
		await writeSuppressions({
			[relPath(fileA)]: { 'required-attr': { count: 1 } },
		});
		expect(await run([fileA], { maxCount: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['a.html', 'no-duplicate-attr']]);
	});

	test('[command-max-count-003] an entry that covers the hidden error is used, and the run succeeds', async () => {
		await writeSuppressions({
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
		});
		expect(await run([fileA], { maxCount: 1 })).toBe(false);
		expect(stderr()).not.toContain('unused suppression');
	});

	test('[command-max-count-004] an entry smaller than the full count suppresses nothing', async () => {
		await writeSuppressions({
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 1 } },
		});
		expect(await run([fileB], { maxCount: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['b.html', 'no-hardcoded-id']]);
	});

	test('[command-max-count-005] an entry of a file skipped by the limit is not reported as unused', async () => {
		await writeSuppressions({
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		});
		expect(await run([fileA, fileB], { maxCount: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['a.html', 'no-duplicate-attr']]);
		expect(stderr()).not.toContain('unused suppression');
	});

	test('[command-max-count-006] suppressed violations do not use up the limit', async () => {
		await writeSuppressions({
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		});
		expect(await run([fileB, fileA], { maxCount: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['a.html', 'no-duplicate-attr']]);
	});

	test('[command-max-count-007] --suppress records the full count of every file', async () => {
		expect(await run([fileA, fileB], { maxCount: 1, suppress: true })).toBe(false);
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual({
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		});
	});

	test('[command-max-count-008] --prune-suppressions keeps the entries the limit hid', async () => {
		const data = {
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		};
		await writeSuppressions(data);
		expect(await run([fileA, fileB], { maxCount: 1, pruneSuppressions: true })).toBe(false);
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual(data);
	});

	test('[command-max-count-009] --fix fixes every file whatever the limit', async () => {
		const fixConfig = path.join(fx.tmpDir, 'fix.json');
		await fs.writeFile(
			fixConfig,
			JSON.stringify({
				rules: {
					'attr-value-quotes': true,
					'no-hardcoded-id': { severity: 'error' },
				},
			}),
			'utf8',
		);
		const files = [path.join(fx.tmpDir, 'x.html'), path.join(fx.tmpDir, 'y.html')];
		for (const file of files) {
			await fs.writeFile(file, '<div id="i" class=c></div>\n', 'utf8');
		}
		// The `no-hardcoded-id` error cannot be fixed, so it fails the run.
		expect(await run(files, { config: fixConfig, maxCount: 1, fix: true })).toBe(true);
		for (const file of files) {
			expect(await fs.readFile(file, 'utf8')).toBe('<div id="i" class="c"></div>\n');
		}
	});

	test('[command-max-count-010] the errors of a file after the limit still fail the run, and stay out of the report', async () => {
		expect(await run([fileW, fileB], { maxCount: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['warning-only.html', 'no-duplicate-attr']]);
	});

	test('[command-max-count-011] the errors of a file after the limit that its entries suppress do not fail the run', async () => {
		await writeSuppressions({
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		});
		expect(await run([fileW, fileB], { maxCount: 1 })).toBe(false);
		expect(stderr()).not.toContain('unused suppression');
	});

	test('[command-max-count-012] a file after the limit is still listed as skipped', async () => {
		await run([fileW, fileB], { maxCount: 1, format: 'simple' });
		expect(stderr()).not.toContain('b.html: ✗');
		expect(stderr()).not.toContain('no-hardcoded-id');
		expect(stderr()).toContain(
			'1 file not reported because --max-count was reached (violations in it still count toward the exit code)',
		);
	});

	test('[command-max-count-013] without a limit, the warning of a.html is reported before its error', async () => {
		expect(await run([fileA])).toBe(true);
		expect(reported()).toStrictEqual([
			['a.html', 'no-duplicate-attr'],
			['a.html', 'no-hardcoded-id'],
		]);
	});

	test('[command-max-count-015] a config-level message counts once for --max-warnings, not once per file after the limit', async () => {
		const cleanFiles = ['clean-1.html', 'clean-2.html', 'clean-3.html'].map(name =>
			path.resolve(import.meta.dirname, '../../test/config-error-dedupe', name),
		);
		// The config uses one deprecated rule name, which is one config-level warning for the whole run.
		const result = await run(cleanFiles, {
			config: path.resolve(import.meta.dirname, '../../test/max-count/deprecated-rule.json'),
			maxCount: 1,
			maxWarnings: 1,
		});
		expect(result).toBe(false);
		expect(reported()).toHaveLength(1);
	});

	test('[command-max-count-014] the warnings of a file after the limit count toward --max-warnings', async () => {
		await writeSuppressions({
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
		});
		// One reported warning is within `--max-warnings=1`; the skipped file's makes two.
		expect(await run([fileA, fileW], { maxCount: 1, maxWarnings: 1 })).toBe(true);
		expect(reported()).toStrictEqual([['a.html', 'no-duplicate-attr']]);
	});
});

describe('command: the entries of a suppressions file are judged per linted file', { timeout: 30_000 }, () => {
	const fx = useCommandFixture('markuplint-command-entries-');
	const { fileA, fileB, relPath, run, stderr } = fx;

	test('[command-suppressions-scope-001] --prune-suppressions keeps the entries of files it did not lint', async () => {
		const data = {
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		};
		await fs.writeFile(fx.suppressionsFile, JSON.stringify(data), 'utf8');
		await run([fileA], { pruneSuppressions: true });
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual(data);
	});

	test('[command-suppressions-scope-002] --prune-suppressions still prunes the entries of the files it linted', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({
				[relPath(fileA)]: {
					'no-hardcoded-id': { count: 1 },
					'required-attr': { count: 1 },
				},
				[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
			}),
			'utf8',
		);
		await run([fileA], { pruneSuppressions: true });
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual({
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		});
	});

	test('[command-suppressions-scope-003] a normal run does not report the entries of files outside the run as unused', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({
				[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
			}),
			'utf8',
		);
		await run([fileA]);
		expect(stderr()).not.toContain('unused suppression');
	});

	test('[command-suppressions-scope-004] a normal run reports the unused entries of the files it linted', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({ [relPath(fileA)]: { 'required-attr': { count: 1 } } }),
			'utf8',
		);
		await run([fileA]);
		expect(stderr()).toContain('1 unused suppression entry/entries found');
	});

	test.each([
		['--no-progressive-output', { progressiveOutput: false }],
		['--max-count', { maxCount: 1 }],
	])(
		'[command-suppressions-scope-005] an unparsable suppressions file fails the run with %s',
		async (_name, flags) => {
			await fs.writeFile(fx.suppressionsFile, '{ not json', 'utf8');
			await expect(run([fileA], flags)).rejects.toThrow('Failed to parse suppressions file');
		},
	);

	test('[command-suppressions-scope-006] a suppressions file does not turn progressive output into batch output', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({
				[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
			}),
			'utf8',
		);
		const reportsBeforeLint: number[] = [];
		const exec = MLEngine.prototype.exec;
		vi.spyOn(MLEngine.prototype, 'exec').mockImplementation(function (this: MLEngine, ...args) {
			// A report that has violations goes to stderr.
			reportsBeforeLint.push(vi.mocked(process.stderr.write).mock.calls.length);
			return exec.apply(this, args);
		});
		await run([fileA, fileB], { format: 'simple', progressiveOutput: true });
		// The first file's report is written before the second file is linted.
		expect(reportsBeforeLint[1]).toBeGreaterThan(0);
	});

	test('[command-suppressions-scope-007] --prune-suppressions prunes the entries of a target the config excludes', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({
				[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
				[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
			}),
			'utf8',
		);
		await run([fileA, fileB], {
			config: fx.configExcludingB,
			pruneSuppressions: true,
		});
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual({
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
		});
	});

	test('[command-suppressions-scope-008] an entry that cannot be applied fails the run', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({ [relPath(fileA)]: { 'no-hardcoded-id': null } }),
			'utf8',
		);
		await expect(run([fileA])).rejects.toThrow();
	});

	test('[command-suppressions-scope-010] --prune-suppressions prunes the entries of a file that no longer exists, and keeps those of an existing file it did not lint', async () => {
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({
				[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
				[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
				[relPath(path.join(fx.tmpDir, 'gone.html'))]: { 'no-hardcoded-id': { count: 1 } },
			}),
			'utf8',
		);
		await run([fileA], { pruneSuppressions: true });
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual({
			[relPath(fileA)]: { 'no-hardcoded-id': { count: 1 } },
			[relPath(fileB)]: { 'no-hardcoded-id': { count: 2 } },
		});
	});

	test('[command-suppressions-scope-009] with --fix, an entry scope is resolved against the fixed code the violations come from', async () => {
		const fixConfig = path.join(fx.tmpDir, 'fix.json');
		await fs.writeFile(
			fixConfig,
			JSON.stringify({ rules: { 'attr-value-quotes': true, 'no-obsolete-element': { severity: 'error' } } }),
			'utf8',
		);
		// Fixing `class=c` to `class="c"` moves `<center>` two columns to the right.
		const file = path.join(fx.tmpDir, 'scoped.html');
		await fs.writeFile(file, '<div class=c></div><center></center>\n', 'utf8');
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({ [relPath(file)]: { 'no-obsolete-element': { count: 1, scope: 'center' } } }),
			'utf8',
		);
		expect(await run([file], { config: fixConfig, fix: true })).toBe(false);
		expect(stderr()).not.toContain('unused suppression');
	});
});

describe('command: --suppress writes the scope of the violations', { timeout: 30_000 }, () => {
	const fx = useCommandFixture('markuplint-command-suppress-scope-');
	const { relPath, run, reported } = fx;

	/** Both `no-duplicate-attr` errors are inside `div#a`, so the scope is `div#a`. */
	const setup = async () => {
		const config = path.join(fx.tmpDir, 'config.json');
		await fs.writeFile(
			config,
			JSON.stringify({ rules: { 'no-duplicate-attr': true, 'no-hardcoded-id': { severity: 'error' } } }),
			'utf8',
		);
		const file = path.join(fx.tmpDir, 'scope.html');
		await fs.writeFile(
			file,
			'<div id="a"><p class="x" class="y">a</p><p class="z" class="w">b</p></div>\n<div class="c"><p>c</p></div>\n',
			'utf8',
		);
		const read = async () =>
			JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8')) as Record<
				string,
				Record<string, { count: number; scope?: string }>
			>;
		return { config, file, read };
	};

	test('[command-suppress-scope-001] --suppress writes the scope that contains every violation', async () => {
		const { config, file, read } = await setup();
		expect(await run([file], { config, suppress: true, suppressRule: 'no-duplicate-attr' })).toBe(false);
		expect(await read()).toStrictEqual({
			[relPath(file)]: { 'no-duplicate-attr': { count: 2, scope: '#a' } },
		});
	});

	test('[command-suppress-scope-002] a second --suppress keeps the scopes already in the file', async () => {
		const { config, file, read } = await setup();
		expect(await run([file], { config, suppress: true, suppressRule: 'no-duplicate-attr' })).toBe(false);
		// A run for another rule leaves the entry of `no-duplicate-attr` as it is.
		expect(await run([file], { config, suppress: true, suppressRule: 'no-hardcoded-id' })).toBe(false);
		// The `id` of `div#a` is a child of `<body>`, so its entry has no scope.
		const both = {
			[relPath(file)]: {
				'no-duplicate-attr': { count: 2, scope: '#a' },
				'no-hardcoded-id': { count: 1 },
			},
		};
		expect(await read()).toStrictEqual(both);
		// A run for the same rule keeps the scope it computes again.
		expect(await run([file], { config, suppress: true, suppressRule: 'no-duplicate-attr' })).toBe(false);
		expect(await read()).toStrictEqual(both);
	});

	test('[command-suppress-scope-003] a new violation outside the written scope is reported', async () => {
		const { config, file } = await setup();
		expect(await run([file], { config, suppress: true, suppressRule: 'no-duplicate-attr' })).toBe(false);
		await fs.writeFile(
			file,
			'<div id="a"><p class="x" class="y">a</p></div>\n<div class="c"><p class="v" class="u">c</p></div>\n',
			'utf8',
		);
		vi.mocked(process.stdout.write).mockClear();
		expect(await run([file], { config })).toBe(true);
		// Only the violation outside `div#a`, on line 2, is reported; the one inside is suppressed.
		const violations = JSON.parse(fx.stdout()) as { ruleId: string; line: number }[];
		expect(violations.filter(v => v.ruleId === 'no-duplicate-attr').map(v => v.line)).toStrictEqual([2]);
	});

	test('[command-suppress-scope-004] a violation at an end tag is inside the scope written for it', async () => {
		const config = path.join(fx.tmpDir, 'case.json');
		await fs.writeFile(
			config,
			JSON.stringify({ rules: { 'case-sensitive-tag-name': { severity: 'error' } } }),
			'utf8',
		);
		// The rule reports `<P>` and `</P>`.
		const file = path.join(fx.tmpDir, 'e.html');
		await fs.writeFile(file, '<div id="a"><P>x</P></div>\n<div class="c"><p>c</p></div>\n', 'utf8');
		expect(await run([file], { config, suppress: true })).toBe(false);
		expect(JSON.parse(await fs.readFile(fx.suppressionsFile, 'utf8'))).toStrictEqual({
			[relPath(file)]: { 'case-sensitive-tag-name': { count: 2, scope: '#a > p' } },
		});
		vi.mocked(process.stdout.write).mockClear();
		expect(await run([file], { config })).toBe(false);
		expect(reported()).toStrictEqual([]);
	});

	test('[command-suppress-scope-005] --suppress gives a scope to an entry written without one', async () => {
		const { config, file, read } = await setup();
		await fs.writeFile(
			fx.suppressionsFile,
			JSON.stringify({ [relPath(file)]: { 'no-duplicate-attr': { count: 5 } } }),
			'utf8',
		);
		expect(await run([file], { config, suppress: true, suppressRule: 'no-duplicate-attr' })).toBe(false);
		expect(await read()).toStrictEqual({
			[relPath(file)]: { 'no-duplicate-attr': { count: 2, scope: '#a' } },
		});
	});
});
