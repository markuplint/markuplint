import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');
const fixtureDir = path.resolve(import.meta.dirname, '../../test/suppressions');
const targetFile = path.join(fixtureDir, 'target.html');

describe('Bulk Suppressions CLI', { timeout: 30_000 }, () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-suppress-test-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	test('--suppress creates suppressions file', async () => {
		const suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');

		const { exitCode, stderr } = await execa(
			entryFilePath,
			['--suppress', '--suppressions-location', suppressionsFile, targetFile],
			{ reject: false },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toContain('[Experimental]');
		expect(stderr).toContain('2 violation(s)');

		const content = JSON.parse(await fs.readFile(suppressionsFile, 'utf8'));
		const keys = Object.keys(content);
		expect(keys).toHaveLength(1);

		const fileEntry = content[keys[0]!]!;
		expect(fileEntry['no-duplicate-attr']).toStrictEqual({ count: 2 });
	});

	test('normal lint suppresses errors when suppressions file exists', async () => {
		const suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');

		// First, generate suppressions
		await execa(entryFilePath, ['--suppress', '--suppressions-location', suppressionsFile, targetFile], {
			reject: false,
		});

		// Now lint with suppressions
		const { exitCode, stdout } = await execa(
			entryFilePath,
			['--no-color', '--format', 'json', '--suppressions-location', suppressionsFile, targetFile],
			{ reject: false },
		);

		expect(exitCode).toBe(0);
		const violations = JSON.parse(stdout);
		// Only warning should remain (case-sensitive-attr-name)
		expect(violations).toHaveLength(1);
		expect(violations[0].ruleId).toBe('case-sensitive-attr-name');
		expect(violations[0].severity).toBe('warning');
	});

	test('reports ALL violations when count exceeds suppressed count', async () => {
		const suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');

		// Write a suppressions file with count=1 (less than actual 2 violations)
		const relPath = path.relative(tmpDir, targetFile).split(path.sep).join('/');
		const suppressionsData = {
			[relPath]: { 'no-duplicate-attr': { count: 1 } },
		};
		await fs.writeFile(suppressionsFile, JSON.stringify(suppressionsData), 'utf8');

		const { stdout } = await execa(
			entryFilePath,
			['--no-color', '--format', 'json', '--suppressions-location', suppressionsFile, targetFile],
			{ reject: false },
		);

		const violations = JSON.parse(stdout);
		// All 3 violations should be reported (2 errors + 1 warning)
		const errors = violations.filter((v: { severity: string }) => v.severity === 'error');
		expect(errors).toHaveLength(2);
	});

	test('--suppress-rule only suppresses specified rule', async () => {
		const suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');

		const { exitCode } = await execa(
			entryFilePath,
			['--suppress-rule', 'no-duplicate-attr', '--suppressions-location', suppressionsFile, targetFile],
			{ reject: false },
		);

		expect(exitCode).toBe(0);

		const content = JSON.parse(await fs.readFile(suppressionsFile, 'utf8'));
		const keys = Object.keys(content);
		const fileEntry = content[keys[0]!]!;
		expect(fileEntry['no-duplicate-attr']).toBeDefined();
		// case-sensitive-attr-name is a warning, not suppressed
		expect(fileEntry['case-sensitive-attr-name']).toBeUndefined();
	});

	test('--prune-suppressions removes stale entries', async () => {
		const suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');

		// Write suppressions with a stale entry
		const relPath = path.relative(tmpDir, targetFile).split(path.sep).join('/');
		const suppressionsData = {
			[relPath]: {
				'no-duplicate-attr': { count: 2 },
				'nonexistent-rule': { count: 5 },
			},
		};
		await fs.writeFile(suppressionsFile, JSON.stringify(suppressionsData), 'utf8');

		const { exitCode, stderr } = await execa(
			entryFilePath,
			['--prune-suppressions', '--suppressions-location', suppressionsFile, targetFile],
			{ reject: false },
		);

		expect(exitCode).toBe(0);
		expect(stderr).toContain('1 entry/entries removed');

		const content = JSON.parse(await fs.readFile(suppressionsFile, 'utf8'));
		const fileEntry = content[Object.keys(content)[0]!]!;
		expect(fileEntry['no-duplicate-attr']).toBeDefined();
		expect(fileEntry['nonexistent-rule']).toBeUndefined();
	});

	test('--suppress and --prune-suppressions together is an error', async () => {
		const { exitCode, stderr } = await execa(entryFilePath, ['--suppress', '--prune-suppressions', targetFile], {
			reject: false,
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('cannot be used together');
	});

	test('--progressive-output does not print violations suppressed by an active suppressions file', async () => {
		const suppressionsFile = path.join(tmpDir, 'markuplint-suppressions.json');

		// First, generate suppressions for no-duplicate-attr
		await execa(entryFilePath, ['--suppress', '--suppressions-location', suppressionsFile, targetFile], {
			reject: false,
		});

		const [withoutProgressive, withProgressive] = await Promise.all([
			execa(entryFilePath, ['--no-color', '--suppressions-location', suppressionsFile, targetFile], {
				reject: false,
			}),
			execa(
				entryFilePath,
				['--no-color', '--progressive-output', '--suppressions-location', suppressionsFile, targetFile],
				{ reject: false },
			),
		]);

		// The suppressed rule must not appear in either mode, and both modes
		// must agree, since progressive output falls back to batch mode
		// whenever a non-empty suppressions file is active.
		expect(withoutProgressive.stdout).not.toContain('no-duplicate-attr');
		expect(withProgressive.stdout).not.toContain('no-duplicate-attr');
		expect(withProgressive.stdout).toBe(withoutProgressive.stdout);
		expect(withProgressive.exitCode).toBe(withoutProgressive.exitCode);
	});
});
