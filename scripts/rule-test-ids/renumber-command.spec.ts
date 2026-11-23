import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const SCRIPT = path.join(import.meta.dirname, 'renumber.ts');
const SRC = 'packages/@markuplint/rules/src';
const RULE_SPEC = `${SRC}/rule-a/index.spec.ts`;
const QUOTED_SPEC = `${SRC}/rule-a/日本語.spec.ts`;
const OUTSIDE = [
	'packages/@markuplint/ml-config/src/rule-aliases.spec.ts',
	'packages/@markuplint/types/src/debug.spec.ts',
];
const UNIT = "import { x } from './x.js';\n\ntest('[unit-valid-001] unit', () => {\n\texpect(x).toBe(1);\n});\n";

/** A spec of the rule `rule-a` that goes through the testing API, one test per name. */
function behavior(...names: string[]) {
	return (
		"import { mlRuleTest } from 'markuplint';\nimport rule from './index.js';\n" +
		names
			.map(
				(name, index) =>
					`\ntest('${name}', async () => {\n\tawait mlRuleTest(rule, '<t${index}>');\n\texpect(1).toBe(1);\n});\n`,
			)
			.join('')
	);
}

let repo = '';

function git(...args: string[]) {
	const result = spawnSync('git', ['-c', 'user.name=tester', '-c', 'user.email=tester@example.test', ...args], {
		cwd: repo,
		encoding: 'utf8',
	});
	expect(result.status, result.stderr).toBe(0);
}

function write(file: string, text: string) {
	const target = path.join(repo, file);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, text);
}

function read(file: string) {
	return readFileSync(path.join(repo, file), 'utf8');
}

function run(...args: string[]) {
	const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, ...args], {
		cwd: repo,
		encoding: 'utf8',
	});
	return { status: result.status, out: result.stdout, err: result.stderr };
}

beforeEach(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'renumber-'));
	git('init', '-q');
	write(`${SRC}/index.ts`, "import A from './rule-a/index.js';\n");
	write(RULE_SPEC, behavior('[rule-a-valid-004] one', '[rule-a-invalid-009] two'));
	// A path that git quotes unless it is told not to
	write(QUOTED_SPEC, behavior('[rule-a-fix-001] three'));
	for (const file of OUTSIDE) {
		write(file, UNIT);
	}
	write('id-map.json', JSON.stringify({ policy: ['test-ids.spec.ts'] }));
	git('add', '-A');
	git('commit', '-q', '-m', 'base');
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe('renumber.ts as a command', { timeout: 30_000 }, () => {
	test('reports what it would write, and writes nothing, without --write', () => {
		const before = read(RULE_SPEC);
		const result = run('--base', 'HEAD', '--map', 'id-map.json');
		expect(result.status, result.err).toBe(0);
		expect(result.out).toContain('would write: 4 specs; renamed: 3; unnumbered: 2');
		expect(read(RULE_SPEC)).toBe(before);
		expect(read('id-map.json')).toBe(JSON.stringify({ policy: ['test-ids.spec.ts'] }));
	});

	test('renumbers the specs, the one that git quotes and the two outside the rules, and writes the map', () => {
		write(
			`${SRC}/test-ids.spec.ts`,
			"test('a policy spec has no counterpart in the base', () => {\n\texpect(1).toBe(1);\n});\n",
		);
		const result = run('--base', 'HEAD', '--map', 'id-map.json', '--write');
		expect(result.status, result.err).toBe(0);
		expect(read(RULE_SPEC)).toContain("test('[rule-a-001] one'");
		expect(read(RULE_SPEC)).toContain("test('[rule-a-002] two'");
		expect(read(QUOTED_SPEC)).toContain("test('[rule-a-003] three'");
		for (const file of OUTSIDE) {
			expect(read(file)).toContain("test('unit'");
		}
		const map = JSON.parse(read('id-map.json')) as {
			policy: string[];
			renamed: unknown[];
			unnumbered: { file: string }[];
		};
		expect(map.policy).toStrictEqual(['test-ids.spec.ts']);
		expect(map.renamed).toStrictEqual([
			{ file: RULE_SPEC, id: 'rule-a-valid-004', to: 'rule-a-001' },
			{ file: RULE_SPEC, id: 'rule-a-invalid-009', to: 'rule-a-002' },
			{ file: QUOTED_SPEC, id: 'rule-a-fix-001', to: 'rule-a-003' },
		]);
		expect(map.unnumbered.map(entry => entry.file)).toStrictEqual(OUTSIDE);
		// Over its own result there is nothing to write
		expect(run('--base', 'HEAD', '--map', 'id-map.json').out).toContain('would write: 0 specs');
	});

	test('fails without --base', () => {
		expect(run('--map', 'id-map.json').status).not.toBe(0);
	});
});
