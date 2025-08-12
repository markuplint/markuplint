import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect, beforeAll } from 'vitest';

import { cli } from './bootstrap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entryFilePath = path.resolve(__dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

async function delay(ms: number) {
	await new Promise(r => setTimeout(r, ms));
}

beforeAll(async () => {
	const originFilePath = path.resolve(__dirname, '../../test/fix/origin.html');
	const fixedFilePath = path.resolve(__dirname, '../../test/fix/fixed.html');
	const originContent = await readFile(originFilePath, { encoding: 'utf8' });
	await writeFile(fixedFilePath, originContent, { encoding: 'utf8' });
	await delay(500);
});

describe('STDOUT Test', () => {
	test('empty', async () => {
		const resultPromise = execa(entryFilePath, []);
		await expect(resultPromise).rejects.toThrow(cli.help.trim().replaceAll('\n  \t', '\n  \\t'));
	});

	test('version', async () => {
		const { stdout } = await execa(entryFilePath, ['--version']);
		expect(stdout).toBe(cli.pkg.version);
	});

	test('version', async () => {
		const { stdout } = await execa(entryFilePath, ['-v']);
		expect(stdout).toBe(cli.pkg.version);
	});

	test('help', async () => {
		const { stdout } = await execa(entryFilePath, ['--help']);
		const { stdout: stdoutShort } = await execa(entryFilePath, ['-h']);
		expect(stdout).toBe(stdoutShort);
		expect(stdout).toBe(cli.help);
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

	test('--severity-parse-error (no specified)', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, [escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('--severity-parse-error error', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, ['--severity-parse-error', 'error', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('--severity-parse-error warning', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, ['--severity-parse-error', 'warning', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('--severity-parse-error off', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, ['--severity-parse-error', 'off', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(0);
	});

	test('--max-violations with 002.html', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');

		// First, get the full number of violations
		const { stderr: fullStderr } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		const fullViolationCount = fullStderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('info')).length;

		// Test with limit
		const { stderr: limitedStderr } = await execa(
			entryFilePath,
			['--no-color', '--max-violations=3', escape(targetFilePath)],
			{
				reject: false,
			},
		);
		const limitedViolationCount = limitedStderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('Maximum')).length;
		const hasInfoMessage = limitedStderr.includes('Maximum 3 violations shown based on --max-violations option');

		expect(fullViolationCount).toBeGreaterThan(3);
		expect(limitedViolationCount).toBe(3);
		expect(hasInfoMessage).toBe(true);
	});

	test('--max-violations=1', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');
		const { stderr, exitCode } = await execa(
			entryFilePath,
			['--no-color', '--max-violations=1', escape(targetFilePath)],
			{
				reject: false,
			},
		);

		const violationCount = stderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('Maximum')).length;
		const hasInfoMessage = stderr.includes('Maximum 1 violations shown based on --max-violations option');

		expect(violationCount).toBe(1);
		expect(hasInfoMessage).toBe(true);
		expect(exitCode).toBe(1); // Still should exit with error
	});

	test('--max-violations=0 (no limit)', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');

		// Get violations without limit
		const { stderr: noLimitStderr } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		const noLimitCount = noLimitStderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('Maximum')).length;

		// Get violations with --max-violations=0
		const { stderr: zeroLimitStderr } = await execa(
			entryFilePath,
			['--no-color', '--max-violations=0', escape(targetFilePath)],
			{
				reject: false,
			},
		);
		const zeroLimitCount = zeroLimitStderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('Maximum')).length;
		const hasNoInfoMessage = !zeroLimitStderr.includes('Maximum');

		// Should be the same (0 means no limit)
		expect(noLimitCount).toBe(zeroLimitCount);
		expect(noLimitCount).toBeGreaterThan(1);
		expect(hasNoInfoMessage).toBe(true); // No info message when no limit
	});

	test('--max-violations with JSON format', async () => {
		const targetFilePath = path.resolve(__dirname, '../../../../test/fixture/002.html');

		// Test with JSON format and limit
		const { stdout } = await execa(entryFilePath, ['--format=json', '--max-violations=2', escape(targetFilePath)], {
			reject: false,
		});

		const violations = JSON.parse(stdout);
		expect(Array.isArray(violations)).toBe(true);
		expect(violations.length).toBe(2);
	});
});

describe('Issues', () => {
	test('#1042', async () => {
		const originFilePath = path.resolve(__dirname, '../../test/fix/origin.html');
		const fixedFilePath = path.resolve(__dirname, '../../test/fix/fixed.html');
		const originContent = await readFile(originFilePath, { encoding: 'utf8' });

		await execa(entryFilePath, ['--fix', escape(fixedFilePath)], {
			reject: false,
		});

		const fixedContent = await readFile(fixedFilePath, { encoding: 'utf8' });
		expect(originContent).toBe(fixedContent);
	});

	test('#1824-1', async () => {
		const filePath = path.resolve(__dirname, '../../test/issue1824/index.html');
		const config1 = path.resolve(__dirname, '../../test/issue1824/config1.json');

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
				message: `Plugin not found: ${path.resolve(__dirname, '../../test/issue1824/no-exist-plugin.js')}`,
				raw: '',
			},
		]);
		expect(stderr).toBe('');
	});

	test('#1824-2', async () => {
		const filePath = path.resolve(__dirname, '../../test/issue1824/index.html');
		const config2 = path.resolve(__dirname, '../../test/issue1824/config2.json');

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
		]);
		expect(stderr).toBe('');
	});
});
