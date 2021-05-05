import { cli } from './cli-bootstrap';
import execa from 'execa';
import path from 'path';

const entryFilePath = path.resolve(__dirname, '../bin/markuplint');

describe('STDIN Test', () => {
	it('empty', async () => {
		const { stdout } = await execa(entryFilePath, [], {
			stdin: 'ignore',
			reject: false,
		});
		expect(stdout).toBe(cli.help);
	});

	it('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--version'], { stdin: 'ignore' });
		expect(stdout).toBe(cli.pkg.version);
	});

	it('version', async () => {
		const { stdout } = await execa(entryFilePath, ['-v'], { stdin: 'ignore' });
		expect(stdout).toBe(cli.pkg.version);
	});

	it('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--help']);
		const { stdout: stdoutShort } = await execa(entryFilePath, ['-h'], { stdin: 'ignore' });
		expect(stdout).toBe(stdoutShort);
	});

	it('verify', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--no-color', targetFilePath], { stdin: 'ignore' });
		expect(stdout).toBe(`<markuplint> passed ${targetFilePath}`);
	});

	it('verify --problem-only', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--problem-only', targetFilePath], {
			stdin: 'ignore',
		});
		expect(stdout).toBe('');
	});

	it('verify and feilure', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../test/fixture/002.html');
		const { stdout, stderr } = await execa(entryFilePath, ['--no-color', targetFilePath], {
			stdin: 'ignore',
			reject: false,
		});
		expect(stdout).toBe('');
		expect(stderr.split('\n').length).toBe(34);
	});

	it('format', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--format', 'JSON', targetFilePath], {
			stdin: 'ignore',
		});
		expect(stdout).toBe('[]');
	});
});
