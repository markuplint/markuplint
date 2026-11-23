import type { CaseReport } from './cases.ts';
import type { Addition, Removal } from './compare.ts';

import { describe, expect, test } from 'vitest';

import { compareCases } from './cases.ts';

// The two reports are made in two checkouts, so the same spec has a different absolute path in each.
const BASE_SRC = '/checkouts/base/packages/@markuplint/rules/src';
const HEAD_SRC = '/work/head/packages/@markuplint/rules/src';

function report(root: string, files: Record<string, [title: string, status?: string][]>): CaseReport {
	return {
		testResults: Object.entries(files).map(([name, cases]) => ({
			name: `${root}/${name}`,
			assertionResults: cases.map(([title, status = 'passed']) => ({ title, status })),
		})),
	};
}

const baseFiles = {
	'rule-a/index.spec.ts': [['[rule-a-valid-001] a'], ['[rule-a-valid-002] b 1'], ['[rule-a-valid-002] b 2']],
	'rule-a/other.spec.ts': [['[rule-a-invalid-009] twin 1'], ['[rule-a-invalid-009] twin 2']],
	'top.spec.ts': [['unit']],
} satisfies Record<string, [string][]>;

const base = report(BASE_SRC, baseFiles);

const removal: Removal = {
	file: 'rule-a/other.spec.ts',
	id: 'rule-a-invalid-009',
	keptIn: 'rule-a/index.spec.ts',
	keptId: 'rule-a-valid-002',
};

const addition: Addition = { file: 'rule-a/more.spec.ts', id: 'rule-a-valid-003' };

describe('compareCases', () => {
	test('has nothing to say when the head is the base, although it was made in another checkout', () => {
		expect(compareCases(base, report(HEAD_SRC, baseFiles), [], [])).toStrictEqual([]);
	});

	test('counts a test.each case by case, and takes a removal off by its cases', () => {
		const head = report(HEAD_SRC, {
			'rule-a/index.spec.ts': baseFiles['rule-a/index.spec.ts'],
			'top.spec.ts': baseFiles['top.spec.ts'],
		});
		expect(compareCases(base, head, [removal], [])).toStrictEqual([]);
	});

	test('reports a case that is missing from a rule', () => {
		const head = report(HEAD_SRC, {
			'rule-a/index.spec.ts': [['[rule-a-valid-001] a'], ['[rule-a-valid-002] b 1']],
			'rule-a/other.spec.ts': baseFiles['rule-a/other.spec.ts'],
			'top.spec.ts': baseFiles['top.spec.ts'],
		});
		expect(compareCases(base, head, [], [])).toStrictEqual(['rule-a: 4 cases ran, 5 were expected from the base']);
	});

	test('reports a case that is not passed', () => {
		const head = report(HEAD_SRC, { ...baseFiles, 'extra.spec.ts': [['broken', 'failed']] });
		expect(compareCases(base, head, [], [])).toStrictEqual([
			'extra.spec.ts: "broken" is failed, not passed',
			'extra.spec.ts: 1 cases ran, 0 were expected from the base',
		]);
	});

	test('counts the cases of an addition that is recorded, in the head', () => {
		const head = report(HEAD_SRC, {
			...baseFiles,
			'rule-a/more.spec.ts': [['[rule-a-valid-003] c 1'], ['[rule-a-valid-003] c 2']],
		});
		expect(compareCases(base, head, [], [addition])).toStrictEqual([]);
		expect(compareCases(base, head, [], [])).toStrictEqual(['rule-a: 7 cases ran, 5 were expected from the base']);
	});

	test('reports an addition that the head report does not have', () => {
		expect(compareCases(base, report(HEAD_SRC, baseFiles), [], [addition])).toStrictEqual([
			'rule-a/more.spec.ts [rule-a-valid-003] is recorded as added, but no case of the head report has that ID',
		]);
	});

	test('reports a removal that the base cannot account for', () => {
		const ghost = { ...removal, id: 'rule-a-invalid-999' };
		expect(compareCases(base, report(HEAD_SRC, baseFiles), [ghost], [])).toStrictEqual([
			'rule-a/other.spec.ts [rule-a-invalid-999] is recorded as removed, but no case of the base report has that ID',
		]);
	});

	test('reports a spec that is not under the rules, as it belongs to no rule', () => {
		const stray: CaseReport = {
			testResults: [{ name: '/elsewhere/x.spec.ts', assertionResults: [{ title: 'x', status: 'passed' }] }],
		};
		expect(compareCases(base, stray, [], [])[0]).toContain('/elsewhere/x.spec.ts');
	});
});
