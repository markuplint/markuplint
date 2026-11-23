import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { parseIdMap } from './id-map.ts';

/**
 * `list-rule-test.mjs` and `src/test-ids.spec.ts` of the rules each read which tests are behavior tests, and
 * `renumber.ts` read it when it numbered them. This is the check that the three have not drifted apart: every
 * ID that the codemod wrote is listed by the script, and the script finds no behavior test without an ID, as
 * the guard asserts in `yarn test`.
 */
const SCRIPT = path.join(
	import.meta.dirname,
	'..',
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

describe('the readers of the behavior tests', { timeout: 60_000 }, () => {
	test('list-rule-test lists every ID that renumber wrote', () => {
		const listed = list('--json');
		expect(listed.status, listed.stderr).toBe(0);
		const ids = new Set((JSON.parse(listed.stdout) as { id: string | null }[]).map(test => test.id));
		const { renamed = [] } = parseIdMap(readFileSync(path.join(import.meta.dirname, 'id-map.json'), 'utf8'));
		expect(renamed.length).toBeGreaterThan(0);
		expect(renamed.map(entry => entry.to).filter(id => !ids.has(id))).toStrictEqual([]);
	});

	test('list-rule-test finds no behavior test without an ID', () => {
		const result = list('--no-id');
		expect(result.stdout).toBe('');
		expect(result.status, result.stderr).toBe(0);
	});

	test('list-rule-test rejects an option that it does not know, as it would list everything', () => {
		expect(list('--category', 'valid').status).toBe(1);
		expect(list('--rule').status).toBe(1);
	});
});
