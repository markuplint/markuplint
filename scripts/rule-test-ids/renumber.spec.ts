import { describe, expect, test } from 'vitest';

import { renumber } from './renumber.ts';

const RULES = new Set(['rule-a', 'rule-b']);
const API = "import { mlRuleTest } from 'markuplint';\nimport rule from './index.js';\n";

/** A spec of one rule, one test per case: `[name, code]`. */
function spec(cases: readonly (readonly [string, string])[], header = API) {
	return (
		header +
		cases
			.map(
				([name, code]) =>
					`\ntest('${name}', async () => {\n\tconst { violations } = await mlRuleTest(rule, '${code}');\n\texpect(violations).toStrictEqual([]);\n});\n`,
			)
			.join('')
	);
}

const SRC = 'packages/@markuplint/rules/src';

function run(base: Record<string, string>, head: Record<string, string>) {
	return renumber({ base: new Map(Object.entries(base)), head: new Map(Object.entries(head)), rules: RULES });
}

describe('numbering', () => {
	test('a behavior test takes the next number of its rule, the index spec first and then the files by path', () => {
		const files = {
			[`${SRC}/rule-a/z.spec.ts`]: spec([['[rule-a-issue-1-001] z', '<z>']]),
			[`${SRC}/rule-a/index.spec.ts`]: spec([
				['[rule-a-valid-001] i1', '<i1>'],
				['[rule-a-invalid-001] i2', '<i2>'],
			]),
			[`${SRC}/rule-a/b.spec.ts`]: spec([['[rule-a-fix-001] b', '<b>']]),
		};
		const result = run(files, files);
		const names = (file: string) => [...(result.files.get(file) ?? '').matchAll(/test\('([^']*)'/g)].map(m => m[1]);
		expect(names(`${SRC}/rule-a/index.spec.ts`)).toStrictEqual(['[rule-a-001] i1', '[rule-a-002] i2']);
		expect(names(`${SRC}/rule-a/b.spec.ts`)).toStrictEqual(['[rule-a-003] b']);
		expect(names(`${SRC}/rule-a/z.spec.ts`)).toStrictEqual(['[rule-a-004] z']);
	});

	test('the numbers of a rule do not depend on another rule', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]: spec([['[rule-a-valid-001] a', '<a>']]),
			[`${SRC}/rule-b/index.spec.ts`]: spec([['[rule-b-valid-007] b', '<b>']]),
		};
		const result = run(files, files);
		expect(result.files.get(`${SRC}/rule-b/index.spec.ts`)).toContain('[rule-b-001] b');
	});

	test('a prefix of any form is replaced, and the text after it stays', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]: spec([
				['[x-strict-001] a [b] c', '<a>'],
				['[rule-a-issue-1146] d', '<d>'],
			]),
		};
		const result = run(files, files);
		expect(result.files.get(`${SRC}/rule-a/index.spec.ts`)).toContain("test('[rule-a-001] a [b] c'");
		expect(result.files.get(`${SRC}/rule-a/index.spec.ts`)).toContain("test('[rule-a-002] d'");
	});

	test('a name of a template literal with a substitution keeps it', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]: `${API}\ntest.each([1, 2])(\`[rule-a-valid-003] value \${'%s'}\`, async () => {\n\tawait mlRuleTest(rule, '<a>');\n});\n`,
		};
		const result = run(files, files);
		expect(result.files.get(`${SRC}/rule-a/index.spec.ts`)).toContain('`[rule-a-001] value ${');
	});
});

describe('what has no ID', () => {
	test('a spec that does not go through the testing API, in a rule or not, loses its prefixes', () => {
		const unit =
			"import { x } from './x.js';\n\ntest('[rule-a-valid-001] unit', () => {\n\texpect(x).toBe(1);\n});\n";
		const files = {
			[`${SRC}/rule-a/x.spec.ts`]: unit,
			[`${SRC}/unregistered/y.spec.ts`]: spec([['[unregistered-valid-001] y', '<y>']]),
			[`${SRC}/top.spec.ts`]: unit,
			'packages/@markuplint/ml-config/src/z.spec.ts': unit,
		};
		const result = run(files, files);
		for (const file of Object.keys(files)) {
			expect(result.files.get(file)).not.toMatch(/test\('\[/);
		}
		expect(result.unnumbered.map(entry => entry.file)).toStrictEqual([
			'packages/@markuplint/ml-config/src/z.spec.ts',
			`${SRC}/rule-a/x.spec.ts`,
			`${SRC}/top.spec.ts`,
			`${SRC}/unregistered/y.spec.ts`,
		]);
	});

	test('a behavior test without a prefix is an error, as it would be left without a number', () => {
		const files = { [`${SRC}/rule-a/index.spec.ts`]: spec([['no prefix', '<a>']]) };
		expect(() => run(files, files)).toThrow(/no prefix/);
	});
});

describe('the map', () => {
	test('records the old ID of the base file against the new one, through a move and a change of ID', () => {
		const base = {
			[`${SRC}/rule-a/index.spec.ts`]: spec([['[rule-a-valid-001] one', '<one>']]),
			[`${SRC}/rule-a/issue-5.spec.ts`]: spec([['[rule-a-issue-5-001] two', '<two>']]),
		};
		const head = {
			[`${SRC}/rule-a/index.spec.ts`]: spec([
				['[rule-a-valid-001] one', '<one>'],
				['[rule-a-issue-5-001] two', '<two>'],
			]),
		};
		const result = run(base, head);
		expect(result.renamed).toStrictEqual([
			{ file: `${SRC}/rule-a/index.spec.ts`, id: 'rule-a-valid-001', to: 'rule-a-001' },
			{ file: `${SRC}/rule-a/issue-5.spec.ts`, id: 'rule-a-issue-5-001', to: 'rule-a-002' },
		]);
	});

	test('fails when a test of the base has no counterpart in the head', () => {
		const base = { [`${SRC}/rule-a/index.spec.ts`]: spec([['[rule-a-valid-001] one', '<one>']]) };
		const head = { [`${SRC}/rule-a/index.spec.ts`]: spec([['[rule-a-valid-001] one', '<changed>']]) };
		expect(() => run(base, head)).toThrow(/no counterpart/);
	});

	test('is the same when the codemod runs on its own result', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]: spec([
				['[rule-a-valid-004] one', '<one>'],
				['[rule-a-invalid-009] two', '<two>'],
			]),
		};
		const first = run(files, files);
		const again = run(files, Object.fromEntries(first.files));
		expect(Object.fromEntries(again.files)).toStrictEqual(Object.fromEntries(first.files));
		expect(again.renamed).toStrictEqual(first.renamed);
	});
});

describe('the references in comments', () => {
	test('an ID in a comment follows the test it names in the same file', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]:
				spec([
					['[rule-a-valid-003] one', '<one>'],
					['[rule-a-valid-009] two', '<two>'],
				]) + '\n// see [rule-a-valid-009] for the rest\n',
		};
		const result = run(files, files);
		expect(result.files.get(`${SRC}/rule-a/index.spec.ts`)).toContain('// see [rule-a-002] for the rest');
	});

	test('an ID of a test that has no ID any more is an error, to be written as the name of the test', () => {
		const files = {
			[`${SRC}/rule-a/x.spec.ts`]:
				"test('[rule-a-valid-001] unit', () => {\n\texpect(1).toBe(1);\n});\n// see [rule-a-valid-001]\n",
		};
		expect(() => run(files, files)).toThrow(/rule-a-valid-001/);
	});

	test('a new ID that a comment names, in this file or another, is left alone, so that a run can be repeated', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]:
				spec([['[rule-a-valid-001] one', '<one>']]) + '\n// see [rule-b-001] and [rule-a-001]\n',
			[`${SRC}/rule-b/index.spec.ts`]: spec([['[rule-b-valid-007] b', '<b>']]),
		};
		const first = run(files, files);
		expect(first.files.get(`${SRC}/rule-a/index.spec.ts`)).toContain('// see [rule-b-001] and [rule-a-001]');
		const again = run(files, Object.fromEntries(first.files));
		expect(Object.fromEntries(again.files)).toStrictEqual(Object.fromEntries(first.files));
	});

	test('a bracket that is not an ID of a test is left alone', () => {
		const files = {
			[`${SRC}/rule-a/index.spec.ts`]:
				spec([['[rule-a-valid-001] one', '<one>']]) + '\n// the list [a, b] and [x]\n',
		};
		expect(run(files, files).files.get(`${SRC}/rule-a/index.spec.ts`)).toContain('// the list [a, b] and [x]');
	});
});
