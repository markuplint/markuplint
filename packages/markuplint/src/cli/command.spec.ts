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
