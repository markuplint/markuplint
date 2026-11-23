import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const SCRIPT = path.join(import.meta.dirname, 'verify-equivalence.ts');
const SRC = path.join('packages', '@markuplint', 'rules', 'src');

const SPEC = `import { mlRuleTest } from 'markuplint';
import rule from './index.js';

test('[rule-a-valid-001] a', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div>');
	expect(violations).toStrictEqual([]);
});

test('[rule-a-valid-002] b', async () => {
	const { violations } = await mlRuleTest(rule, '<span></span>');
	expect(violations).toStrictEqual([]);
});
`;

let repo = '';

function git(...args: string[]) {
	const result = spawnSync('git', ['-c', 'user.name=tester', '-c', 'user.email=tester@example.test', ...args], {
		cwd: repo,
		encoding: 'utf8',
	});
	expect(result.status, result.stderr).toBe(0);
}

function write(file: string, text: string) {
	const target = path.join(repo, SRC, file);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, text);
}

/**
 * Runs the verifier in the temporary repository.
 *
 * @param args - Its arguments
 * @param cwd - Where to run it, relative to the repository
 * @returns Its exit status and what it wrote
 */
function run(args: string[], cwd = '.') {
	const result = spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, ...args], {
		cwd: path.join(repo, cwd),
		encoding: 'utf8',
	});
	return { status: result.status, out: result.stdout, err: result.stderr };
}

/** A map file in the repository, outside the specs. */
function writeMap(map: unknown) {
	const file = path.join(repo, 'id-map.json');
	writeFileSync(file, JSON.stringify(map));
	return file;
}

beforeEach(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'verify-equivalence-'));
	git('init', '-q');
	write('rule-a/index.spec.ts', SPEC);
	git('add', '-A');
	git('commit', '-q', '-m', 'base');
});

afterEach(() => {
	rmSync(repo, { recursive: true, force: true });
});

describe('verify-equivalence', { timeout: 30_000 }, () => {
	test('passes when the specs are as they were', () => {
		const map = writeMap({});
		const result = run(['--base', 'HEAD', '--map', map]);
		expect(result.status, result.err).toBe(0);
		expect(result.out).toContain('2 tests; working tree: 2 tests');
		expect(result.out).toContain('cases: not checked');
	});

	test('passes when a test is moved to another file of the rule and renamed', () => {
		const map = writeMap({});
		write('rule-a/index.spec.ts', SPEC.split('\n\n').slice(0, 2).join('\n\n') + '\n');
		write(
			'rule-a/other.spec.ts',
			`import { mlRuleTest } from 'markuplint';\nimport rule from './index.js';\n\n${SPEC.split('\n\n')[2]!.replace('[rule-a-valid-002] b', 'renamed')}`,
		);
		const result = run(['--base', 'HEAD', '--map', map]);
		expect(result.status, result.err).toBe(0);
	});

	test('leaves out a spec that the map lists as a policy spec, and reports the same spec when it is not listed', () => {
		write('policy.spec.ts', `test('a policy', () => {\n\texpect(1).toBe(1);\n});\n`);
		const unlisted = run(['--base', 'HEAD', '--map', writeMap({})]);
		expect(unlisted.status).toBe(1);
		expect(unlisted.err).toContain('appeared');
		const listed = run(['--base', 'HEAD', '--map', writeMap({ policy: ['policy.spec.ts'] })]);
		expect(listed.status, listed.err).toBe(0);
	});

	test('fails when an assertion is flipped', () => {
		const map = writeMap({});
		write('rule-a/index.spec.ts', SPEC.replace('toStrictEqual([])', 'not.toStrictEqual([])'));
		const result = run(['--base', 'HEAD', '--map', map]);
		expect(result.status).toBe(1);
		expect(result.err).toContain('vanished');
		expect(result.err).toContain('appeared');
	});

	test('fails when a test is lost', () => {
		const map = writeMap({});
		write('rule-a/index.spec.ts', SPEC.split('\n\n').slice(0, 2).join('\n\n') + '\n');
		const result = run(['--base', 'HEAD', '--map', map]);
		expect(result.status).toBe(1);
		expect(result.err).toContain('vanished');
	});

	test('accepts a removal that the map records', () => {
		write('rule-a/index.spec.ts', SPEC.replace("'<span></span>'", "'<div></div>'"));
		git('add', '-A');
		git('commit', '-q', '-m', 'make the tests identical');
		write('rule-a/index.spec.ts', SPEC.split('\n\n').slice(0, 2).join('\n\n') + '\n');
		const map = writeMap({
			removed: [
				{
					file: 'rule-a/index.spec.ts',
					id: 'rule-a-valid-002',
					keptIn: 'rule-a/index.spec.ts',
					keptId: 'rule-a-valid-001',
				},
			],
		});
		const result = run(['--base', 'HEAD', '--map', map]);
		expect(result.status, result.err).toBe(0);
	});

	test('works from a subdirectory of the repository', () => {
		const map = writeMap({});
		const result = run(['--base', 'HEAD', '--map', map], path.join(SRC, 'rule-a'));
		expect(result.status, result.err).toBe(0);
	});

	test('fails without --base', () => {
		const result = run(['--map', writeMap({})]);
		expect(result.status).toBe(1);
		expect(result.err).toContain('--base <ref> is required');
	});

	test('fails with one report and not the other', () => {
		const result = run(['--base', 'HEAD', '--map', writeMap({}), '--base-report', 'base.json']);
		expect(result.status).toBe(1);
		expect(result.err).toContain('go together');
	});

	test('fails on a spec that is not a .spec.ts, as it would not be read', () => {
		write('rule-a/x.spec.mjs', 'test("x", () => {});\n');
		const result = run(['--base', 'HEAD', '--map', writeMap({})]);
		expect(result.status).toBe(1);
		expect(result.err).toContain('x.spec.mjs');
	});

	test('fails on a map with a key that it does not know', () => {
		const result = run(['--base', 'HEAD', '--map', writeMap({ remove: [] })]);
		expect(result.status).toBe(1);
		expect(result.err).toContain('unknown key "remove"');
	});
});
