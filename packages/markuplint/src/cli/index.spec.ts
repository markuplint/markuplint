import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { cli } from './bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entryFilePath = path.resolve(__dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replace(/\\/g, '\\\\'); // For Windows

describe('STDOUT Test', () => {
	test('empty', async () => {
		const resultPromise = execa(entryFilePath, []);
		await expect(resultPromise).rejects.toThrow(cli.help);
	});

	test('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--version']);
		expect(stdout).toBe(cli.pkg.version);
	});

	test('version', async () => {
		const { stdout } = await execa(entryFilePath, ['-v']);
		expect(stdout).toBe(cli.pkg.version);
	});

	test('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--help']);
		const { stdout: stdoutShort } = await execa(entryFilePath, ['-h']);
		expect(stdout).toBe(stdoutShort);
	});

	test('verify', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout, exitCode } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)]);
		expect(stdout).toBe(`<markuplint> passed ${targetFilePath}`);
		expect(exitCode).toBe(0);
	});

	test('verify --problem-only', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--problem-only', escape(targetFilePath)]);
		expect(stdout).toBe('');
	});

	test('verify and failure', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		expect(stdout).toBe('');
		expect(stderr.split('\n').length).toBe(30);
		expect(exitCode).toBe(1);
	});

	test('allow warnings', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['--allow-warnings', escape(targetFilePath)], {
			reject: false,
		});
		expect(stdout).toBe('');
		expect(stderr.split('\n').length).toBe(24);
		expect(exitCode).toBe(0);
	});

	test('format', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
	});

	test('no files', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { stdout, exitCode } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
		expect(exitCode).toBe(0);
	});

	test('no files --allow-empty-input="true"', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--allow-empty-input="true"', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(0);
	});

	test('no files --allow-empty-input="false"', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--allow-empty-input="false"', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('no files --no-allow-empty-input', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--no-allow-empty-input', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});
});
