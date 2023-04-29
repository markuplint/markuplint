// @ts-nocheck

import path from 'path';

import execa from 'execa';

import { cli } from './bootstrap';

const entryFilePath = path.resolve(__dirname, '../../bin/markuplint');

const escape = (path: string) => path.replace(/\\/g, '\\\\'); // For Windows

describe('STDOUT Test', () => {
	it('empty', async () => {
		const resultPromise = execa(entryFilePath, []);
		await expect(resultPromise).rejects.toThrow(cli.help);
	});

	it('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--version']);
		expect(stdout).toBe(cli.pkg.version);
	});

	it('version', async () => {
		const { stdout } = await execa(entryFilePath, ['-v']);
		expect(stdout).toBe(cli.pkg.version);
	});

	it('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--help']);
		const { stdout: stdoutShort } = await execa(entryFilePath, ['-h']);
		expect(stdout).toBe(stdoutShort);
	});

	it('verify', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout, exitCode } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)]);
		expect(stdout).toBe(`<markuplint> passed ${targetFilePath}`);
		expect(exitCode).toBe(0);
	});

	it('verify --problem-only', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--problem-only', escape(targetFilePath)]);
		expect(stdout).toBe('');
	});

	it('verify and failure', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		expect(stdout).toBe('');
		expect(stderr.split('\n').length).toBe(34);
		expect(exitCode).toBe(1);
	});

	it('format', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
	});
});
