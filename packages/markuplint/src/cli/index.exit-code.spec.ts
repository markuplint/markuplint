// One of the `index*.spec.ts` that hold the CLI specs by topic; `index.spec.ts` says why.
// The exit decision across formats and flags is covered in-process by `command.spec.ts`;
// this spawns the binary once to cover the path from `command()` to the process exit code.
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

describe('--format JSON exit code', () => {
	test('--no-allow-warnings exits with 1 and still prints the warnings as JSON', async () => {
		const fixtureDir = path.resolve(import.meta.dirname, '../../test/exit-code');
		const targetFilePath = path.join(fixtureDir, 'fragment.html');

		const { stdout, stderr, exitCode } = await execa(
			entryFilePath,
			[
				escape(targetFilePath),
				'--config',
				escape(path.join(fixtureDir, 'warning.json')),
				'--no-search-config',
				'--format',
				'JSON',
				'--no-allow-warnings',
			],
			{ reject: false, env: { LANG: 'en' } },
		);
		expect(JSON.parse(stdout)).toStrictEqual([
			{
				severity: 'warning',
				message: 'It is hard-coded',
				line: 1,
				col: 6,
				raw: 'id="fixed"',
				ruleId: 'no-hardcoded-id',
				filePath: targetFilePath,
			},
		]);
		expect(stderr).toBe('');
		expect(exitCode).toBe(1);
	});
});
