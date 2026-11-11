// One of the `index*.spec.ts` that hold the CLI specs by topic; `index.spec.ts` says why.
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

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
