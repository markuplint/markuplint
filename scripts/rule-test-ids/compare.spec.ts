import type { Fingerprinted, Problem, Removal } from './compare.ts';

import { describe, expect, test } from 'vitest';

import { compare, idOf, scopeOf } from './compare.ts';

function t(file: string, id: string, hash: string, scope = 'rule-a', body?: string): Fingerprinted {
	return { scope, file, line: 1, name: `[${id}] name`, hash, ...(body ? { body } : {}) };
}

const kinds = (problems: readonly Problem[]) => problems.map(problem => problem.kind);

const base = [t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1'), t('rule-a/index.spec.ts', 'rule-a-valid-002', 'h2')];

describe('compare', () => {
	test('is empty when every test is still there', () => {
		expect(compare(base, base.toReversed(), [], [])).toStrictEqual([]);
	});

	test('reports a test that vanished', () => {
		expect(kinds(compare(base, [base[0]!], [], []))).toStrictEqual(['vanished']);
	});

	test('reports a test that appeared, or one whose body changed', () => {
		const changed = [base[0]!, t('rule-a/index.spec.ts', 'rule-a-valid-002', 'h2-flipped')];
		expect(kinds(compare(base, changed, [], []))).toStrictEqual(['vanished', 'appeared']);
	});

	test('reports the same body in another setting as one problem', () => {
		const before = [t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1', 'rule-a', 'body-1')];
		const after = [t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1-in-hook', 'rule-a', 'body-1')];
		expect(kinds(compare(before, after, [], []))).toStrictEqual(['context-changed']);
	});

	test('does not take a different body for the same test in another setting', () => {
		const before = [t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1', 'rule-a', 'body-1')];
		const after = [t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1x', 'rule-a', 'body-2')];
		expect(kinds(compare(before, after, [], []))).toStrictEqual(['vanished', 'appeared']);
	});

	test('a test that moved to another rule is not the same test', () => {
		const moved = [base[0]!, t('rule-b/index.spec.ts', 'rule-a-valid-002', 'h2', 'rule-b')];
		expect(kinds(compare(base, moved, [], []))).toStrictEqual(['vanished', 'appeared']);
	});

	describe('an addition that is recorded', () => {
		const added = [t('rule-a/index.spec.ts', 'rule-a-valid-003', 'h3')];
		const addition = { file: 'rule-a/index.spec.ts', id: 'rule-a-valid-003' };

		test('is accepted', () => {
			expect(compare(base, [...base, ...added], [], [addition])).toStrictEqual([]);
		});

		test('is reported when the head does not have it', () => {
			expect(kinds(compare(base, base, [], [addition]))).toStrictEqual(['addition-not-applied']);
		});

		test('is reported when the same test is already in the base', () => {
			const twin = { file: 'rule-a/index.spec.ts', id: 'rule-a-valid-001' };
			const head = [...base, t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1')];
			expect(kinds(compare(base, head, [], [twin]))).toStrictEqual(['addition-not-new', 'appeared']);
		});

		test('is reported when it is listed twice', () => {
			expect(kinds(compare(base, [...base, ...added], [], [addition, addition]))).toStrictEqual([
				'duplicate-entry',
			]);
		});

		test('does not hide a test that appeared besides it', () => {
			const head = [...base, ...added, t('rule-a/index.spec.ts', 'rule-a-valid-004', 'h4')];
			expect(kinds(compare(base, head, [], [addition]))).toStrictEqual(['appeared']);
		});
	});

	describe('a removal that is recorded', () => {
		const withTwin = [...base, t('rule-a/other.spec.ts', 'rule-a-invalid-009', 'h2')];
		const removal: Removal = {
			file: 'rule-a/other.spec.ts',
			id: 'rule-a-invalid-009',
			keptIn: 'rule-a/index.spec.ts',
			keptId: 'rule-a-valid-002',
		};

		test('is accepted when an identical test is kept', () => {
			expect(compare(withTwin, base, [removal], [])).toStrictEqual([]);
		});

		test('is reported when nothing was removed', () => {
			expect(kinds(compare(withTwin, withTwin, [removal], []))).toStrictEqual(['removal-not-applied']);
		});

		test('is reported when the kept test is not identical', () => {
			const other = { ...removal, keptId: 'rule-a-valid-001' };
			expect(kinds(compare(withTwin, base, [other], []))).toStrictEqual(['vanished', 'removal-not-identical']);
		});

		test('is reported when the kept test belongs to another rule', () => {
			const elsewhere = [...base, t('rule-b/index.spec.ts', 'rule-b-valid-001', 'h2', 'rule-b')];
			const across = { ...removal, file: 'rule-b/index.spec.ts', id: 'rule-b-valid-001' };
			expect(kinds(compare(elsewhere, base, [across], []))).toStrictEqual(['vanished', 'removal-not-identical']);
		});

		test('is reported when the removed test is not in the base', () => {
			const ghost = { ...removal, id: 'rule-a-invalid-999' };
			expect(kinds(compare(withTwin, base, [ghost], []))).toStrictEqual(['vanished', 'removal-unknown']);
		});

		test('is reported when the test that stays is gone too', () => {
			expect(kinds(compare(withTwin, [base[0]!], [removal], []))).toStrictEqual(['vanished']);
		});

		test('is reported when two removals name each other and no copy stays', () => {
			const twins = [
				t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1'),
				t('rule-a/other.spec.ts', 'rule-a-valid-002', 'h1'),
			];
			const first = {
				file: 'rule-a/index.spec.ts',
				id: 'rule-a-valid-001',
				keptIn: 'rule-a/other.spec.ts',
				keptId: 'rule-a-valid-002',
			};
			const second = {
				file: 'rule-a/other.spec.ts',
				id: 'rule-a-valid-002',
				keptIn: 'rule-a/index.spec.ts',
				keptId: 'rule-a-valid-001',
			};
			expect(kinds(compare(twins, [], [first, second], []))).toStrictEqual(['removal-removes-all']);
		});

		test('is reported when it is listed twice, so that one deletion has no record', () => {
			const three = [
				t('rule-a/index.spec.ts', 'rule-a-valid-001', 'h1'),
				t('rule-a/other.spec.ts', 'rule-a-valid-002', 'h1'),
				t('rule-a/other.spec.ts', 'rule-a-valid-003', 'h1'),
			];
			const entry = {
				file: 'rule-a/other.spec.ts',
				id: 'rule-a-valid-002',
				keptIn: 'rule-a/index.spec.ts',
				keptId: 'rule-a-valid-001',
			};
			expect(kinds(compare(three, [three[0]!], [entry, entry], []))).toStrictEqual([
				'vanished',
				'duplicate-entry',
			]);
		});

		test('does not hide a different test that vanished at the same time', () => {
			expect(kinds(compare(withTwin, [base[0]!], [removal], []))).toStrictEqual(['vanished']);
		});
	});
});

describe('scopeOf', () => {
	test('is the directory of a spec in a rule, and the file for a spec at the top', () => {
		expect(scopeOf('rule-a/sub/x.spec.ts')).toBe('rule-a');
		expect(scopeOf('rule-a/index.spec.ts')).toBe('rule-a');
		expect(scopeOf('helpers.spec.ts')).toBe('helpers.spec.ts');
	});
});

describe('idOf', () => {
	test('is the ID at the start of a name', () => {
		expect(idOf('[rule-a-valid-001] a name')).toBe('rule-a-valid-001');
	});

	test('is undefined when the name has none, or the bracket is not at the start', () => {
		expect(idOf('a name')).toBeUndefined();
		expect(idOf('a [rule-a-valid-001] name')).toBeUndefined();
	});
});
