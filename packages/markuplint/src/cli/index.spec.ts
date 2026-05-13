import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect, beforeAll } from 'vitest';

import { cli } from './bootstrap.js';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

async function delay(ms: number) {
	await new Promise(r => setTimeout(r, ms));
}

beforeAll(async () => {
	const originFilePath = path.resolve(import.meta.dirname, '../../test/fix/origin.html');
	const fixedFilePath = path.resolve(import.meta.dirname, '../../test/fix/fixed.html');
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
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/001.html');
		const { stdout, exitCode } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)]);
		expect(stdout).toBe([`<markuplint> passed ${targetFilePath}`, '', '✔ 1 file checked, 0 problems'].join('\n'));
		expect(exitCode).toBe(0);
	});

	test('verify --problem-only', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--problem-only', escape(targetFilePath)]);
		expect(stdout).toBe('');
	});

	test('verify and failure', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');
		const { stdout, stderr, exitCode } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		expect(stdout).toBe('');
		expect(stderr.split('\n').length).toBe(33);
		expect(exitCode).toBe(0);
	});

	test('allow warnings', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');
		const { stdout, stderr, exitCode } = await execa(
			entryFilePath,
			['--no-allow-warnings', '--no-color', escape(targetFilePath)],
			{
				reject: false,
				env: { LANG: 'en' },
			},
		);
		expect(stdout).toBe('');
		expect(stderr.split('\n')).toStrictEqual([
			`<markuplint> warning: Attribute value is must quote on double quotation mark / For consistency (attr-value-quotes) ${targetFilePath}:2:7`,
			'   1: <!DOCTYPE\u2022html>',
			'   2: <html\u2022lang=en>',
			'            ^^^^^^^ ',
			'   3: <head>',
			`<markuplint> warning: Attribute value is must quote on double quotation mark / Another reason (attr-value-quotes) ${targetFilePath}:4:8`,
			'   3: <head>',
			'   4: \u2192   <meta\u2022charset=UTF-8>',
			'                ^^^^^^^^^^^^^ ',
			"   5: \u2192   <meta\u2022name=viewport\u2022content='width=device-width,\u2022initial-scale=1.0'>",
			`<markuplint> warning: Attribute value is must quote on double quotation mark / Another reason (attr-value-quotes) ${targetFilePath}:5:8`,
			'   4: \u2192   <meta\u2022charset=UTF-8>',
			"   5: \u2192   <meta\u2022name=viewport\u2022content='width=device-width,\u2022initial-scale=1.0'>",
			'                ^^^^^^^^^^^^^                                                 ',
			'   6: \u2192   <meta\u2022http-equiv=X-UA-Compatible\u2022content=ie=edge>',
			`<markuplint> warning: Attribute value is must quote on double quotation mark / Another reason (attr-value-quotes) ${targetFilePath}:5:22`,
			'   4: \u2192   <meta\u2022charset=UTF-8>',
			"   5: \u2192   <meta\u2022name=viewport\u2022content='width=device-width, initial-scale=1.0'>",
			'                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ',
			'   6: \u2192   <meta\u2022http-equiv=X-UA-Compatible\u2022content=ie=edge>',
			`<markuplint> warning: Attribute value is must quote on double quotation mark / Another reason (attr-value-quotes) ${targetFilePath}:6:8`,
			"   5: \u2192   <meta\u2022name=viewport\u2022content='width=device-width,\u2022initial-scale=1.0'>",
			'   6: \u2192   <meta\u2022http-equiv=X-UA-Compatible\u2022content=ie=edge>',
			'                ^^^^^^^^^^^^^^^^^^^^^^^^^^                 ',
			'   7: \u2192   <title>Document</title>',
			`<markuplint> warning: Attribute value is must quote on double quotation mark / Another reason (attr-value-quotes) ${targetFilePath}:6:35`,
			"   5: \u2192   <meta\u2022name=viewport\u2022content='width=device-width,\u2022initial-scale=1.0'>",
			'   6: \u2192   <meta\u2022http-equiv=X-UA-Compatible\u2022content=ie=edge>',
			'                                           ^^^^^^^^^^^^^^^ ',
			'   7: \u2192   <title>Document</title>',
			'',
			'✖ 6 problems (0 errors, 6 warnings) in 1 file',
			'1 file checked: 0 passed, 1 failed',
		]);
		expect(exitCode).toBe(1);
	});

	test('format', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/001.html');
		const { stdout } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
	});

	test('no files', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/xxx/*');
		const { stdout, exitCode } = await execa(entryFilePath, ['--format', 'JSON', escape(targetFilePath)]);
		expect(stdout).toBe('[]');
		expect(exitCode).toBe(0);
	});

	test('no files --allow-empty-input="true"', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--allow-empty-input="true"', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(0);
	});

	test('no files --allow-empty-input="false"', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--allow-empty-input="false"', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('no files --no-allow-empty-input', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/xxx/*');
		const { exitCode } = await execa(entryFilePath, ['--no-allow-empty-input', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('--severity-parse-error (no specified)', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, [escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('--severity-parse-error error', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, ['--severity-parse-error', 'error', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(1);
	});

	test('--severity-parse-error warning', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, ['--severity-parse-error', 'warning', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(0);
	});

	test('--severity-parse-error off', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/pug/004.pug');
		const { exitCode } = await execa(entryFilePath, ['--severity-parse-error', 'off', escape(targetFilePath)], {
			reject: false,
		});
		expect(exitCode).toBe(0);
	});

	test('without --severity-parse-error, non-fatal parse5 events are NOT emitted (#3844 opt-in default)', async () => {
		// 002.html contains a malformed `content=ie=edge` attribute that parse5
		// reports as `unexpected-character-in-unquoted-attribute-value`. After
		// the opt-in default, the CLI must NOT emit that as a violation unless
		// the user explicitly enables it via `--severity-parse-error` or
		// `severity.parseError` in config.
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');
		const { stderr } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		expect(stderr).not.toContain('parse-error');
		expect(stderr).not.toContain('Parser conformance error');
	});

	test('with --severity-parse-error error, non-fatal parse5 events ARE emitted (uniform opt-in)', async () => {
		// Same fixture, but explicitly opted in — the parse5 event must now
		// appear on stderr.
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');
		const { stderr } = await execa(
			entryFilePath,
			['--no-color', '--severity-parse-error', 'error', escape(targetFilePath)],
			{ reject: false },
		);
		expect(stderr).toContain('Parser conformance error: unexpected-character-in-unquoted-attribute-value');
		expect(stderr).toContain('(parse-error)');
	});

	test('parserOptions.documentMode "document" in .markuplintrc surfaces missing-doctype on bare <head> input', async () => {
		// `bare-head.html` starts with `<head>` and has no `<!doctype html>`.
		// With `documentMode: 'document'` the HTML parser is forced to treat
		// it as a full document, so parse5 fires `missing-doctype`. This
		// pins the Config → engine propagation path for `parserOptions`.
		const targetFilePath = path.resolve(import.meta.dirname, '../../test/parse-error/bare-head.html');
		const configFilePath = path.resolve(import.meta.dirname, '../../test/parse-error/config-document.json');
		const { stderr } = await execa(
			entryFilePath,
			['--no-color', '--config', escape(configFilePath), '--no-search-config', escape(targetFilePath)],
			{ reject: false },
		);
		expect(stderr).toContain('Parser conformance error: missing-doctype');
	});

	test('parserOptions.documentMode "fragment" in .markuplintrc silences missing-doctype on bare <head> input', async () => {
		// Same fixture, but `documentMode: 'fragment'` keeps parse5 in
		// fragment mode and `missing-doctype` is not emitted. Confirms the
		// override flows from JSON config → engine → tokenize() correctly.
		const targetFilePath = path.resolve(import.meta.dirname, '../../test/parse-error/bare-head.html');
		const configFilePath = path.resolve(import.meta.dirname, '../../test/parse-error/config-fragment.json');
		const { stderr } = await execa(
			entryFilePath,
			['--no-color', '--config', escape(configFilePath), '--no-search-config', escape(targetFilePath)],
			{ reject: false },
		);
		expect(stderr).not.toContain('Parser conformance error: missing-doctype');
	});

	test('--max-count with 002.html', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

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
			['--no-color', '--max-count=3', escape(targetFilePath)],
			{
				reject: false,
			},
		);
		const limitedViolationCount = limitedStderr.split('\n').filter(line => line.includes('<markuplint>')).length;

		expect(fullViolationCount).toBeGreaterThan(3);
		expect(limitedViolationCount).toBe(3);
	});

	test('--max-count=1', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');
		const { stderr, exitCode } = await execa(
			entryFilePath,
			['--no-color', '--max-count=1', escape(targetFilePath)],
			{
				reject: false,
			},
		);

		const violationCount = stderr.split('\n').filter(line => line.includes('<markuplint>')).length;

		expect(violationCount).toBe(1);
		expect(exitCode).toBe(0); // allowWarnings defaults to true, so warnings-only exits with 0
	});

	test('--max-count=0 (no limit)', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

		// Get violations without limit
		const { stderr: noLimitStderr } = await execa(entryFilePath, ['--no-color', escape(targetFilePath)], {
			reject: false,
		});
		const noLimitCount = noLimitStderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('info')).length;

		// Get violations with --max-count=0
		const { stderr: zeroLimitStderr } = await execa(
			entryFilePath,
			['--no-color', '--max-count=0', escape(targetFilePath)],
			{
				reject: false,
			},
		);
		const zeroLimitCount = zeroLimitStderr
			.split('\n')
			.filter(line => line.includes('<markuplint>') && !line.includes('info')).length;

		// Should be the same (0 means no limit)
		expect(noLimitCount).toBe(zeroLimitCount);
		expect(noLimitCount).toBeGreaterThan(1);
	});

	test('--max-count with JSON format', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

		// Test with JSON format and limit
		const { stdout } = await execa(entryFilePath, ['--format=json', '--max-count=2', escape(targetFilePath)], {
			reject: false,
		});

		const violations = JSON.parse(stdout);
		expect(Array.isArray(violations)).toBe(true);
		expect(violations.length).toBe(2);
	});

	test('--max-count with multiple files shows skipped status', async () => {
		const targetFiles = [
			path.resolve(import.meta.dirname, '../../../../test/fixture/001.html'), // No violations
			path.resolve(import.meta.dirname, '../../../../test/fixture/002.html'), // Has violations
			path.resolve(import.meta.dirname, '../../../../test/fixture/003.html'), // Should be skipped
		];

		const { stdout, stderr } = await execa(
			entryFilePath,
			['--no-color', '--max-count=3', '--format=simple', ...targetFiles.map(escape)],
			{
				reject: false,
			},
		);

		// Check for passed, processed, and skipped indicators
		expect(stdout).toContain('✓'); // 001.html should be passed
		expect(stdout).toContain('⚠'); // 003.html should be skipped
		expect(stderr).toContain('✖ 3 problems (0 errors, 3 warnings) in 2 files');
		expect(stderr).toContain('2 files checked: 1 passed, 1 failed');
	});
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
				message: `Plugin not found: ${path.resolve(import.meta.dirname, '../../test/issue1824/no-exist-plugin.js')}`,
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
		]);
		expect(stderr).toBe('');
	});
});

describe('--max-warnings option', () => {
	test('--max-warnings=-1 (default) does not limit warnings', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

		const { exitCode } = await execa(entryFilePath, [escape(targetFilePath)], {
			reject: false,
		});

		// Should behave same as without --max-warnings (allowWarnings defaults to true)
		expect(exitCode).toBe(0);
	});

	test('--max-warnings=0 exits with code 1 when warnings exist', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

		const { exitCode, stderr } = await execa(entryFilePath, ['--max-warnings=0', escape(targetFilePath)], {
			reject: false,
		});

		expect(exitCode).toBe(1);
		expect(stderr).toContain('warning'); // Should have warnings
	});

	test('--max-warnings=5 allows warnings up to limit', async () => {
		// Use existing fixture file that has 6 warnings
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

		// With limit 10, should exit with code 0 (6 warnings < 10)
		const { exitCode: exitCode10 } = await execa(
			entryFilePath,
			['--max-warnings=10', '--allow-warnings', escape(targetFilePath)],
			{ reject: false },
		);
		expect(exitCode10).toBe(0);

		// With limit 3, should exit with code 1 (6 warnings > 3)
		const { exitCode: exitCode3 } = await execa(
			entryFilePath,
			['--max-warnings=3', '--allow-warnings', escape(targetFilePath)],
			{ reject: false },
		);
		expect(exitCode3).toBe(1);
	});

	test('--max-warnings with multiple files aggregates warning counts', async () => {
		// Use files with only warnings:
		// 001.html: 0 warnings, 002.html: 6 warnings = 6 total
		const targetFiles = [
			path.resolve(import.meta.dirname, '../../../../test/fixture/001.html'),
			path.resolve(import.meta.dirname, '../../../../test/fixture/002.html'),
		];

		// With limit 10, should exit with code 0 (6 warnings < 10)
		const { exitCode: exitCode10 } = await execa(
			entryFilePath,
			['--max-warnings=10', '--allow-warnings', ...targetFiles.map(escape)],
			{ reject: false },
		);
		expect(exitCode10).toBe(0);

		// With limit 3, should exit with code 1 (6 warnings > 3)
		const { exitCode: exitCode3 } = await execa(
			entryFilePath,
			['--max-warnings=3', '--allow-warnings', ...targetFiles.map(escape)],
			{ reject: false },
		);
		expect(exitCode3).toBe(1);
	});

	test('--max-warnings with warnings-only file still returns exit code 0', async () => {
		// Use a file that has warnings only (allowWarnings defaults to true)
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/002.html');

		const { exitCode } = await execa(entryFilePath, ['--max-warnings=100', escape(targetFilePath)], {
			reject: false,
		});

		// allowWarnings defaults to true, and 6 warnings < 100 limit
		expect(exitCode).toBe(0);
	});
});

describe('--fix-dry-run', () => {
	test('produces diff output for fixable file without modifying it', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../test/fix/dry-run-target.html');
		const configFilePath = path.resolve(import.meta.dirname, '../../test/fix/dry-run-config.json');

		const originalContent = await readFile(targetFilePath, { encoding: 'utf8' });

		const result = await execa(
			entryFilePath,
			[
				'--fix-dry-run',
				'--no-color',
				'--config',
				escape(configFilePath),
				'--no-search-config',
				escape(targetFilePath),
			],
			{ reject: false },
		);

		// File must NOT be modified
		const afterContent = await readFile(targetFilePath, { encoding: 'utf8' });
		expect(afterContent).toBe(originalContent);

		// stdout should contain unified diff output
		expect(result.stdout).toContain('--- a/');
		expect(result.stdout).toContain('+++ b/');
		expect(result.stdout).toContain('@@');
	});

	test('produces no diff output for file without fixable issues', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../../../test/fixture/001.html');

		const { stdout } = await execa(entryFilePath, ['--fix-dry-run', '--no-color', escape(targetFilePath)], {
			reject: false,
		});

		// No diff output because there are no fixable violations
		expect(stdout).not.toContain('--- a/');
		expect(stdout).not.toContain('+++ b/');
	});

	test('--fix and --fix-dry-run combined: dry-run takes precedence', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../test/fix/dry-run-target.html');
		const configFilePath = path.resolve(import.meta.dirname, '../../test/fix/dry-run-config.json');

		const originalContent = await readFile(targetFilePath, { encoding: 'utf8' });

		const { stderr } = await execa(
			entryFilePath,
			[
				'--fix',
				'--fix-dry-run',
				'--no-color',
				'--config',
				escape(configFilePath),
				'--no-search-config',
				escape(targetFilePath),
			],
			{ reject: false },
		);

		// File must NOT be modified (dry-run takes precedence)
		const afterContent = await readFile(targetFilePath, { encoding: 'utf8' });
		expect(afterContent).toBe(originalContent);

		// Warning should be emitted
		expect(stderr).toContain('--fix-dry-run takes precedence');
	});
});
