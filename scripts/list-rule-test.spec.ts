import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

/**
 * `.claude/skills/list-rule-test/scripts/list-rule-test.mjs` is what `packages/@markuplint/rules/CLAUDE.md`
 * and the `qa-engineer` skill tell a contributor to run, and its exit status is the contract of `--no-id`
 * (a check: silent and 0 when every behavior test has an ID) and of an option it does not know (1, as it
 * would otherwise list everything). It runs here as a process because the exit status is what is tested.
 */
const SCRIPT = path.join(
	import.meta.dirname,
	'..',
	'.claude',
	'skills',
	'list-rule-test',
	'scripts',
	'list-rule-test.mjs',
);

function list(...args: string[]) {
	return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

describe('list-rule-test', { timeout: 60_000 }, () => {
	test('--no-id prints nothing and exits 0 when every behavior test has an ID', () => {
		const result = list('--no-id');
		expect(result.stdout).toBe('');
		expect(result.status, result.stderr).toBe(0);
	});

	test('an option that it does not know exits 1', () => {
		expect(list('--category', 'valid').status).toBe(1);
		expect(list('--rule').status).toBe(1);
	});
});
