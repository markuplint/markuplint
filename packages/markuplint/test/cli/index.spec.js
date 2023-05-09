const path = require('path');

const execa = require('execa');

const { cli } = require('../../lib/cli/bootstrap');

const entryFilePath = path.resolve(__dirname, '../../bin/markuplint');

const escape = path => path.replace(/\\/g, '\\\\'); // For Windows

jest.setTimeout(10000);

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
		expect(stderr.split('\n').length).toBe(30);
		expect(exitCode).toBe(1);
	});

	it('allow warnings', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['--allow-warnings', escape(targetFilePath)], {
			reject: false,
		});
		expect(stdout).toBe('');
		expect(stderr.split('\n').length).toBe(24);
		expect(exitCode).toBe(0);
	});

	it('format', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
	});

	it('no files', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { stdout, exitCode } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
		expect(exitCode).toBe(0);
	});

	it('no files --allow-empty-input="true"', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--allow-empty-input="true"', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(0);
	});

	it('no files --allow-empty-input="false"', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--allow-empty-input="false"', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	it('no files --no-allow-empty-input', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--no-allow-empty-input', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});
});
