// One of the `index*.spec.ts` that hold the CLI specs by topic; `index.spec.ts` says why.
// `execa` captures stdout through a pipe, which is the case where the process exit must not
// drop the report that is still queued (see the module JSDoc of `index.ts`).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { afterAll, beforeAll, describe, test, expect } from 'vitest';

import { cli } from './bootstrap.js';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');
const configFilePath = path.resolve(import.meta.dirname, '../../test/exit-code/warning.json');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

// One violation of `no-hardcoded-id` is about 330 bytes of JSON, so this report is far
// beyond the 64 KiB pipe buffer (the size a pipe took on macOS before the fix; #4554 saw 128 KiB).
const LINES = 1000;
const html = '<div id="x"></div>\n'.repeat(LINES);

describe('A report larger than the pipe buffer reaches stdout', () => {
	let tmpDir: string;
	let targetFilePath: string;

	beforeAll(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-pipe-test-'));
		targetFilePath = path.join(tmpDir, 'big.html');
		await fs.writeFile(targetFilePath, html);
	});

	afterAll(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	test('file argument: the whole JSON is parsable and the warnings exit with 0', async () => {
		const { stdout, exitCode } = await execa(
			entryFilePath,
			[escape(targetFilePath), '--config', escape(configFilePath), '--no-search-config', '--format', 'JSON'],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(stdout.length).toBeGreaterThan(128 * 1024);
		expect(JSON.parse(stdout)).toHaveLength(LINES);
		expect(exitCode).toBe(0);
	});

	test('file argument: --no-allow-warnings exits with 1 and still prints the whole JSON', async () => {
		const { stdout, exitCode } = await execa(
			entryFilePath,
			[
				escape(targetFilePath),
				'--config',
				escape(configFilePath),
				'--no-search-config',
				'--format',
				'JSON',
				'--no-allow-warnings',
			],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(JSON.parse(stdout)).toHaveLength(LINES);
		expect(exitCode).toBe(1);
	});

	test('file argument: the whole report of the standard format reaches stderr', async () => {
		const { stderr, exitCode } = await execa(
			entryFilePath,
			[escape(targetFilePath), '--config', escape(configFilePath), '--no-search-config', '--no-color'],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(stderr.length).toBeGreaterThan(64 * 1024);
		expect(stderr).toContain(`:${LINES}:`);
		expect(exitCode).toBe(0);
	});

	test('the `-` operand reads stdin and prints the whole JSON', async () => {
		const { stdout, exitCode } = await execa(
			entryFilePath,
			['-', '--config', escape(configFilePath), '--no-search-config', '--format', 'JSON'],
			{ input: html, reject: false, env: { LANG: 'en' } },
		);
		expect(JSON.parse(stdout)).toHaveLength(LINES);
		expect(exitCode).toBe(0);
	});
});

describe('The `-` operand', () => {
	test('an empty stdin is linted as an empty source, not answered with the help', async () => {
		const { stdout, stderr, exitCode } = await execa(
			entryFilePath,
			['-', '--config', escape(configFilePath), '--no-search-config', '--format', 'JSON'],
			{ input: '', reject: false, env: { LANG: 'en' } },
		);
		expect(JSON.parse(stdout)).toStrictEqual([]);
		expect(stderr).toBe('');
		expect(exitCode).toBe(0);
	});

	test('exits with 1 on an error and still prints the JSON', async () => {
		const { stdout, exitCode } = await execa(
			entryFilePath,
			[
				'-',
				'--config',
				escape(path.resolve(import.meta.dirname, '../../test/exit-code/error.json')),
				'--no-search-config',
				'--format',
				'JSON',
			],
			{ input: '<div id="x"></div>\n', reject: false, env: { LANG: 'en' } },
		);
		expect(JSON.parse(stdout)).toHaveLength(1);
		expect(exitCode).toBe(1);
	});

	test('cannot be combined with a file path', async () => {
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['-', 'a.html', '--format', 'JSON'], {
			input: html,
			reject: false,
			env: { LANG: 'en' },
		});
		expect(stdout).toBe('');
		expect(stderr).toContain('`-`');
		expect(exitCode).toBe(1);
	});

	// The no-operand path (a pipe in, a terminal out) needs a TTY on stdout, which a spawned
	// process here cannot have; `main.spec.ts` covers it in-process.
	test.each([
		['--fix', ['--fix']],
		['--search', ['--search', 'div']],
		['--suppress', ['--suppress']],
		['--suppress-rule', ['--suppress-rule', 'attr-value-quotes']],
		['--prune-suppressions', ['--prune-suppressions']],
	])('cannot be combined with %s, and no file is written (#4560)', async (flag, flagArgs) => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-stdin-fix-test-'));
		try {
			const { stdout, stderr, exitCode } = await execa(
				entryFilePath,
				['-', ...flagArgs, '--config', escape(configFilePath), '--no-search-config'],
				{ cwd, input: '<div id=x></div>\n', reject: false, env: { LANG: 'en' } },
			);
			expect(stdout).toBe('');
			expect(stderr).toContain(flag);
			expect(exitCode).toBe(1);
			expect(await fs.readdir(cwd)).toStrictEqual([]);
		} finally {
			await fs.rm(cwd, { recursive: true, force: true });
		}
	});

	test('cannot be repeated', async () => {
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['-', '-', '--format', 'JSON'], {
			input: html,
			reject: false,
			env: { LANG: 'en' },
		});
		expect(stdout).toBe('');
		expect(stderr).toContain('`-`');
		expect(exitCode).toBe(1);
	});

	test('cannot be combined with --search', async () => {
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['-', '--search', 'div'], {
			input: html,
			reject: false,
			env: { LANG: 'en' },
		});
		expect(stdout).toBe('');
		expect(stderr).toContain('`-`');
		expect(exitCode).toBe(1);
	});
});

describe('Other outputs larger than the pipe buffer reach the end', () => {
	let tmpDir: string;
	let targetFilePath: string;
	let unquotedFilePath: string;
	let manyRulesConfigPath: string;

	beforeAll(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markuplint-pipe-test-'));
		targetFilePath = path.join(tmpDir, 'big.html');
		await fs.writeFile(targetFilePath, html);
		// `attr-value-quotes` fixes an unquoted value, and each fix is a line of the diff.
		unquotedFilePath = path.join(tmpDir, 'unquoted.html');
		await fs.writeFile(unquotedFilePath, '<div id=x></div>\n'.repeat(LINES * 3));
		manyRulesConfigPath = path.join(tmpDir, 'many-rules.json');
		await fs.writeFile(
			manyRulesConfigPath,
			JSON.stringify({
				nodeRules: Array.from({ length: LINES }, (_, i) => ({
					selector: `div.class-number-${i}`,
					rules: { 'no-hardcoded-id': true },
				})),
			}),
		);
	});

	afterAll(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	test('--format GitHub prints every annotation', async () => {
		const { stderr, exitCode } = await execa(
			entryFilePath,
			[escape(targetFilePath), '--config', escape(configFilePath), '--no-search-config', '--format', 'GitHub'],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(stderr.length).toBeGreaterThan(64 * 1024);
		expect(stderr.trimEnd().split('\n')).toHaveLength(LINES);
		expect(exitCode).toBe(0);
	});

	// A location is `<path>:<line>:<col>`, so its size depends on the length of the temporary
	// directory (shorter on Linux than on macOS): three times the lines keep it above the buffer.
	test('--search prints every location', async () => {
		const { stdout, exitCode } = await execa(
			entryFilePath,
			[escape(unquotedFilePath), '--search', 'div', '--no-search-config'],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(stdout.length).toBeGreaterThan(64 * 1024);
		expect(stdout.trimEnd().split('\n')).toHaveLength(LINES * 3);
		expect(exitCode).toBe(0);
	});

	test('--show-config prints the whole configuration', async () => {
		const { stdout, exitCode } = await execa(
			entryFilePath,
			[escape(targetFilePath), '--config', escape(manyRulesConfigPath), '--no-search-config', '--show-config'],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(stdout.length).toBeGreaterThan(64 * 1024);
		expect(JSON.parse(stdout).nodeRules).toHaveLength(LINES);
		expect(exitCode).toBe(0);
	});

	test('--fix-dry-run prints the whole diff', async () => {
		const configPath = path.join(tmpDir, 'quotes.json');
		await fs.writeFile(configPath, JSON.stringify({ rules: { 'attr-value-quotes': true } }));
		const { stdout, exitCode } = await execa(
			entryFilePath,
			[escape(unquotedFilePath), '--config', escape(configPath), '--no-search-config', '--fix-dry-run'],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(stdout.length).toBeGreaterThan(64 * 1024);
		expect(stdout.trimEnd().split('\n').pop()).toContain('id="x"');
		expect(exitCode).toBe(0);
	});
});

describe('--help and --version are answered by themselves only as the sole argument', () => {
	// The argument after `--version` is taken as its value, so there is no file to lint: the help, and 1.
	test('--version with another argument prints the help and exits with 1', async () => {
		const { stdout, exitCode } = await execa(entryFilePath, ['--version', 'extra.html'], {
			reject: false,
			stripFinalNewline: false,
		});
		expect(stdout).toBe(`${cli.help}\n`);
		expect(exitCode).toBe(1);
	});

	test('--help with another argument prints the help and exits with 1', async () => {
		const { stdout, exitCode } = await execa(entryFilePath, ['--help', 'extra.html'], {
			reject: false,
			stripFinalNewline: false,
		});
		expect(stdout).toBe(`${cli.help}\n`);
		expect(exitCode).toBe(1);
	});
});

describe('--help and --version are printed with the bytes meow printed', () => {
	test('--version is the version and one line feed', async () => {
		const { stdout, exitCode } = await execa(entryFilePath, ['--version'], { stripFinalNewline: false });
		expect(stdout).toBe(`${cli.pkg.version}\n`);
		expect(exitCode).toBe(0);
	});

	test('--help is the help text and a line feed after its own', async () => {
		const { stdout, exitCode } = await execa(entryFilePath, ['--help'], { stripFinalNewline: false });
		expect(stdout).toBe(`${cli.help}\n`);
		expect(exitCode).toBe(0);
	});
});
