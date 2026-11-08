// One of the `index*.spec.ts` that hold the CLI specs by topic; `index.spec.ts` says why.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

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

describe('#3890: exit code reflects post-fix violations', () => {
	// no-boolean-attr-value at severity error: the pre-fix code MUST exit 1
	// (proven by the --fix-dry-run test below), the fixed code exits 0
	const configFilePath = path.resolve(import.meta.dirname, '../../test/fix/exit-code-config.json');

	test('--fix: exits 0 when every violation is fixed', async () => {
		// Self-resetting fixture: restore the violating content before running
		const targetFilePath = path.resolve(import.meta.dirname, '../../test/fix/exit-code-fixed.html');
		await writeFile(targetFilePath, '<input required="required" />\n', { encoding: 'utf8' });

		const { exitCode } = await execa(
			entryFilePath,
			['--fix', '--config', escape(configFilePath), '--no-search-config', escape(targetFilePath)],
			{ reject: false },
		);

		// The fixed file has no remaining violations, so the exit code is 0
		// (previously it was 1 because the first-pass violations were counted)
		const afterContent = await readFile(targetFilePath, { encoding: 'utf8' });
		expect(afterContent).toBe('<input required />\n');
		expect(exitCode).toBe(0);
	});

	test('--fix-dry-run: exits 1 because the file on disk is not modified', async () => {
		const targetFilePath = path.resolve(import.meta.dirname, '../../test/fix/dry-run-target.html');

		const { exitCode } = await execa(
			entryFilePath,
			['--fix-dry-run', '--config', escape(configFilePath), '--no-search-config', escape(targetFilePath)],
			{ reject: false },
		);

		expect(exitCode).toBe(1);
	});
});
