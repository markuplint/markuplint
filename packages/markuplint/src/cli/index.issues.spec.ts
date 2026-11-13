// One of the `index*.spec.ts` that hold the CLI specs by topic; `index.spec.ts` says why.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

async function delay(ms: number) {
	await new Promise(r => setTimeout(r, ms));
}

// `test/fix/fixed.html` is what the `#1042` test fixes in place, and no other spec reads it.
beforeAll(async () => {
	const originFilePath = path.resolve(import.meta.dirname, '../../test/fix/origin.html');
	const fixedFilePath = path.resolve(import.meta.dirname, '../../test/fix/fixed.html');
	const originContent = await readFile(originFilePath, { encoding: 'utf8' });
	await writeFile(fixedFilePath, originContent, { encoding: 'utf8' });
	await delay(500);
});

describe('Issues', () => {
	test('#1042', async () => {
		const originFilePath = path.resolve(import.meta.dirname, '../../test/fix/origin.html');
		const fixedFilePath = path.resolve(import.meta.dirname, '../../test/fix/fixed.html');
		const originContent = await readFile(originFilePath, { encoding: 'utf8' });

		const configFilePath = path.resolve(import.meta.dirname, '../../test/fix/fix-test.markuplintrc');
		await execa(
			entryFilePath,
			['--fix', escape(fixedFilePath), '--config', escape(configFilePath), '--no-search-config'],
			{
				reject: false,
			},
		);

		const fixedContent = await readFile(fixedFilePath, { encoding: 'utf8' });
		expect(originContent).toBe(fixedContent);
	});

	test('#1824-1', async () => {
		const filePath = path.resolve(import.meta.dirname, '../../test/issue1824/index.html');
		const config1 = path.resolve(import.meta.dirname, '../../test/issue1824/config1.json');

		const { stdout, stderr } = await execa(
			entryFilePath,
			[escape(filePath), '--config', escape(config1), '--no-color', '--format', 'json', '--no-search-config'],
			{
				reject: false,
			},
		);

		expect(JSON.parse(stdout)).toEqual([
			{
				ruleId: 'config-error',
				filePath,
				severity: 'warning',
				line: 1,
				col: 1,
				message: `"plugins" is not supported: the plugin mechanism was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins) in ${config1}`,
				raw: '',
			},
		]);
		expect(stderr).toBe('');
	});

	test('#1824-2', async () => {
		const filePath = path.resolve(import.meta.dirname, '../../test/issue1824/index.html');
		const config2 = path.resolve(import.meta.dirname, '../../test/issue1824/config2.json');

		const { stdout, stderr } = await execa(
			entryFilePath,
			[escape(filePath), '--config', escape(config2), '--no-color', '--format', 'json', '--no-search-config'],
			{
				reject: false,
			},
		);

		expect(JSON.parse(stdout)).toEqual([
			{
				ruleId: 'config-error',
				filePath,
				severity: 'warning',
				line: 1,
				col: 1,
				message: 'Rule not found: no-exist-namespace/my-rule',
				raw: '',
			},
			{
				ruleId: 'config-error',
				filePath,
				severity: 'warning',
				line: 1,
				col: 1,
				message: `"plugins" is not supported: the plugin mechanism was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins) in ${config2}`,
				raw: '',
			},
		]);
		expect(stderr).toBe('');
	});
});

describe('config that cannot be loaded (#4113)', () => {
	test('an unknown preset fails the run', async () => {
		const filePath = path.resolve(import.meta.dirname, '../../test/issue4113/index.html');
		const config = path.resolve(import.meta.dirname, '../../test/issue4113/config.json');

		const { stderr, exitCode } = await execa(
			entryFilePath,
			[escape(filePath), '--config', escape(config), '--no-color', '--no-search-config'],
			{
				reject: false,
			},
		);

		// The path after "in" is the one given to `--config`, which `escape` doubles the backslashes of.
		expect(stderr).toContain('error: Preset markuplint:no-exists is not found in ');
		expect(stderr).toContain('config.json (config-error)');
		expect(stderr).toContain('1 problem (1 error, 0 warnings) in 1 file');
		expect(exitCode).toBe(1);
	});
});

describe('a config file the search finds that throws when it is imported (#4413)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'markuplint-cli-throwing-config-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('is reported with its path and the location of the throw', async () => {
		// Imported by Node.js itself here, not by Vitest's module runner, so the frame of the throw
		// is the one users see.
		const configFile = path.join(tmpDir, '.markuplintrc.mjs');
		await writeFile(configFile, "// line 1\nthrow new Error('bad option');\n");
		const filePath = path.join(tmpDir, 'index.html');
		await writeFile(filePath, '<!doctype html><html lang="en"><title>a</title><p>a</p></html>');

		const { stderr, exitCode } = await execa(entryFilePath, [escape(filePath), '--no-color'], { reject: false });

		// The column differs between runtimes (Bun points at `Error`, Node.js at `new`).
		expect(stderr).toMatch(new RegExp(`Failed to load ${RegExp.escape(configFile)}:2:\\d+: bad option in `));
		expect(exitCode).toBe(1);
	});
});

describe('a malformed config file the search would reach (#4409)', () => {
	let tmpDir: string;
	let filePath: string;
	let validConfig: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'markuplint-cli-no-search-'));
		await writeFile(path.join(tmpDir, '.markuplintrc'), '{ "rules":');
		filePath = path.join(tmpDir, 'index.html');
		await writeFile(filePath, '<!doctype html><html lang="en"><title>a</title><p>a</p></html>');
		validConfig = path.join(tmpDir, 'valid.json');
		await writeFile(validConfig, JSON.stringify({ rules: {} }));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('is reported while the search is enabled', async () => {
		const { stderr, exitCode } = await execa(entryFilePath, [escape(filePath), '--no-color'], { reject: false });

		expect(stderr).toContain('(config-error)');
		expect(exitCode).toBe(1);
	});

	test('does not affect --no-search-config', async () => {
		const { stderr, exitCode } = await execa(
			entryFilePath,
			[escape(filePath), '--no-color', '--no-search-config', '--config', escape(validConfig)],
			{ reject: false },
		);

		expect(stderr).not.toContain('config-error');
		expect(stderr).not.toContain('YAML Error');
		expect(exitCode).toBe(0);
	});

	test('does not affect --config', async () => {
		const { stderr, exitCode } = await execa(
			entryFilePath,
			[escape(filePath), '--no-color', '--config', escape(validConfig)],
			{ reject: false },
		);

		expect(stderr).not.toContain('config-error');
		expect(exitCode).toBe(0);
	});
});
