import { cli } from './cli-bootstrap';
import execa from 'execa';
import path from 'path';

const entryFilePath = path.resolve(__dirname, '../bin/markuplint');

describe('STDIN Test', () => {
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
		const targetFilePath = path.resolve(__dirname, '../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--no-color', targetFilePath]);
		expect(stdout).toBe(`<markuplint> passed ${targetFilePath}`);
	});

	it('format', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--format', 'JSON', targetFilePath]);
		expect(stdout).toBe('[]');
	});
});
