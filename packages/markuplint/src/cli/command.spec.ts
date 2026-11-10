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
		documentGetter = vi.spyOn(MLEngine.prototype, 'document', 'get');
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
