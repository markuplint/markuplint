import { describe, expect, test } from 'vitest';

import { fingerprintSource } from './fingerprint.ts';

/**
 * @param source - The text of a spec file
 * @param file - Where it is, relative to the rules' `src`
 * @returns The hashes of its tests, in order
 */
function hashes(source: string, file = 'rule-a/index.spec.ts') {
	return fingerprintSource(file, source).map(t => t.hash);
}

/**
 * @param source - The text of a spec file that has one test
 * @param file - Where it is, relative to the rules' `src`
 * @returns The hash of that test; a source that yields no test or several is a mistake of the spec
 */
function one(source: string, file = 'rule-a/index.spec.ts') {
	const found = hashes(source, file);
	expect(found).toHaveLength(1);
	return found[0];
}

const BASE = `
import { mlRuleTest } from 'markuplint';
import rule from './index.js';
const code = '<div></div>';
test('[rule-a-valid-001] name', async () => {
	const { violations } = await mlRuleTest(rule, code);
	expect(violations).toStrictEqual([]);
});
`;

/**
 * @param body - The statements of a test body
 * @returns A spec file of one test with that body, after the constants `a` and `b`
 */
function withBody(body: string, header = "const a = 'x';") {
	return `${header}\ntest('[rule-a-valid-001] t', () => { ${body} });`;
}

describe('what is not part of a test', () => {
	test('the name and the comments', () => {
		const renamed = BASE.replace('[rule-a-valid-001] name', 'another name') + '\n// a comment\n';
		expect(one(renamed)).toBe(one(BASE));
	});

	test('the name of a constant that the body reads', () => {
		expect(one(BASE.replaceAll('code', 'markup'))).toBe(one(BASE));
	});

	test('the place of the test: in a describe that carries the constant along', () => {
		const moved = `
import { mlRuleTest } from 'markuplint';
import rule from './index.js';
describe('group', () => {
	const code = '<div></div>';
	test('[rule-a-valid-001] name', async () => {
		const { violations } = await mlRuleTest(rule, code);
		expect(violations).toStrictEqual([]);
	});
});
`;
		expect(one(moved)).toBe(one(BASE));
	});

	test('the file in the rule that imports the same module by a relative path', () => {
		expect(one(BASE, 'rule-a/issue-1.spec.ts')).toBe(one(BASE, 'rule-a/index.spec.ts'));
	});

	test('a file in a subdirectory that reaches the same module by another relative path', () => {
		// Built in pieces: a literal that starts with `../` is taken for a file that the spec reads
		// (`scripts/affected-tests/completeness.spec.ts`), and this is the text of a spec, not a path.
		const parentIndex = ['..', 'index.js'].join('/');
		expect(one(BASE.replace("'./index.js'", `'${parentIndex}'`), 'rule-a/sub/x.spec.ts')).toBe(
			one(BASE, 'rule-a/index.spec.ts'),
		);
	});

	test('the extension of an imported module', () => {
		expect(one(BASE.replace("'./index.js'", "'./index'"))).toBe(one(BASE));
	});

	test('the kind of quotes, and a template literal without a substitution', () => {
		const quoted = (literal: string) => withBody(`expect(a).toBe(${literal});`);
		expect(one(quoted('"y"'))).toBe(one(quoted("'y'")));
		expect(one(quoted('`y`'))).toBe(one(quoted("'y'")));
	});

	test('redundant parentheses, type assertions and non-null assertions', () => {
		const plain = withBody('expect(a).toBe(1 + 2);');
		expect(one(withBody('expect((a)).toBe((1 + 2));'))).toBe(one(plain));
		expect(one(withBody('expect(a as string).toBe(1 + 2);'))).toBe(one(plain));
		expect(one(withBody('expect(a!).toBe(1 + 2);'))).toBe(one(plain));
	});

	test('whether an array or an object is broken over lines, as a formatter decides', () => {
		expect(one(withBody('use([{ a: 1 }]);'))).toBe(one(withBody('use([\n{ a: 1 }\n]);')));
		expect(one(withBody('use({ a: 1, b: [1, 2] });'))).toBe(one(withBody('use({\na: 1,\nb: [\n1,\n2\n]\n});')));
	});

	test('a comma that closes a list, and the text of a template literal with a substitution', () => {
		expect(one(withBody('use([1, 2,], { a: 1, },);'))).toBe(one(withBody('use([1, 2], { a: 1 });')));
		expect(one(withBody('use(`x${a}y`);'))).not.toBe(one(withBody('use(`x${a}z`);')));
		expect(one(withBody('use(`x${a}y`);'))).toBe(one(withBody('use(`x${\na\n}y`);')));
	});

	test('the order of the keys of an object', () => {
		expect(one(withBody('use({ a: 1, b: 2 });'))).toBe(one(withBody('use({ b: 2, a: 1 });')));
	});

	test('it for test', () => {
		expect(one(BASE.replace('test(', 'it('))).toBe(one(BASE));
	});

	test('CRLF line ends in a multi-line literal', () => {
		const lf = withBody('use(`a\nb`);');
		expect(one(lf.replaceAll('\n', '\r\n'))).toBe(one(lf));
	});

	test('a describe that adds no hook or table around the test', () => {
		expect(one(`describe('g', () => { ${BASE} });`)).toBe(one(BASE));
	});
});

describe('what changes the behavior that a test pins', () => {
	test('a flipped assertion', () => {
		expect(one(BASE.replace('toStrictEqual([])', 'not.toStrictEqual([])'))).not.toBe(one(BASE));
	});

	test('the value of a constant that the body reads', () => {
		expect(one(BASE.replace('<div></div>', '<span></span>'))).not.toBe(one(BASE));
	});

	test('a constant resolved to another module, or from the same module by another name', () => {
		expect(one(BASE.replace("'./index.js'", "'./other.js'"))).not.toBe(one(BASE));
		expect(one(BASE.replace('import rule from', 'import { rule } from'))).not.toBe(one(BASE));
	});

	test('the grouping of an expression', () => {
		expect(one(withBody('use((1 + 2) * 3);'))).not.toBe(one(withBody('use(1 + 2 * 3);')));
	});

	test('a key of an object that has a spread', () => {
		expect(one(withBody('use({ ...a, b: 1, c: 2 });'))).not.toBe(one(withBody('use({ c: 2, ...a, b: 1 });')));
	});

	test('a hook of the group that the test is in', () => {
		const group = (hook: string) => `
describe('group', () => {
	${hook}
	test('[rule-a-valid-001] name', () => {
		expect(1).toBe(1);
	});
});
`;
		expect(one(group('beforeEach(() => setup(1));'))).not.toBe(one(group('beforeEach(() => setup(2));')));
	});

	test('a hook inside a condition', () => {
		const group = (n: number) => `
describe('group', () => {
	if (flag) { beforeEach(() => setup(${n})); }
	test('[rule-a-valid-001] name', () => { expect(1).toBe(1); });
});
`;
		expect(one(group(1))).not.toBe(one(group(2)));
	});

	test('a top-level statement that has an effect on the whole file', () => {
		expect(one(`vi.mock('a');\n${BASE}`)).not.toBe(one(BASE));
	});

	test('a table of test.each', () => {
		const each = (table: string) => `test.each(${table})('[rule-a-valid-001] %s', x => { expect(x).toBe(1); });`;
		expect(one(each('[1, 2]'))).not.toBe(one(each('[1, 3]')));
	});

	test('test.each against test', () => {
		expect(one("test.each([1])('[rule-a-valid-001] a', x => { expect(x).toBe(1); });")).not.toBe(
			one("test('[rule-a-valid-001] a', x => { expect(x).toBe(1); });"),
		);
	});

	test('the table of a test.each written as a template literal', () => {
		const each = (row: number) =>
			`test.each\`\n a | b\n ${row} | 2\n\`('[rule-a-valid-001] $a', ({ a }) => { expect(a).toBe(1); });`;
		expect(one(each(1))).not.toBe(one(each(3)));
	});

	test('what a loop around the test iterates', () => {
		const loop = (list: string) =>
			`for (const x of ${list}) { test('[rule-a-valid-001] ' + x, () => { expect(x).toBe(1); }); }`;
		expect(one(loop('[1, 2]'))).not.toBe(one(loop('[1, 3]')));
	});

	test('what a loop around a describe iterates', () => {
		const loop = (list: string) =>
			`for (const x of ${list}) { describe('group', () => { test('[rule-a-valid-001] a', () => { expect(x).toBe(1); }); }); }`;
		expect(one(loop('[1, 2]'))).not.toBe(one(loop('[1, 3]')));
	});

	test('the condition around a test', () => {
		const guarded = (condition: string) =>
			`if (${condition}) { test('[rule-a-valid-001] a', () => { expect(1).toBe(1); }); }`;
		expect(one(guarded('a'))).not.toBe(one(guarded('b')));
	});

	test('what a forEach around a test walks', () => {
		const each = (list: string) =>
			`${list}.forEach(x => { test('[rule-a-valid-001] a', () => { expect(x).toBe(1); }); });`;
		expect(one(each('[1, 2]'))).not.toBe(one(each('[1, 3]')));
	});

	test('a skip modifier of a test, and of a group', () => {
		expect(one(BASE.replace('test(', 'test.skip('))).not.toBe(one(BASE));
		const group = (chain: string) => `${chain}('g', () => { ${BASE} });`;
		expect(one(group('describe.skip'))).not.toBe(one(group('describe')));
		expect(one(group('describe.only'))).not.toBe(one(group('describe')));
	});

	test('an option of a group', () => {
		const group = (options: string) => `describe('g', ${options}, () => { ${BASE} });`;
		expect(one(group('{ skip: true }'))).not.toBe(one(group('{ skip: false }')));
	});

	test('a constant that the body reads when a function in the test has a parameter of the same name', () => {
		const spec = (value: string) =>
			`const code = '${value}';\ntest('[rule-a-valid-001] a', () => { use(code); [1].map(code => code); });`;
		expect(one(spec('<a>'))).not.toBe(one(spec('<b>')));
	});

	test('the value that a constant is made of, when a describe has a constant of the same name', () => {
		const spec = (outer: string) => `
const base = '${outer}';
const derived = base + 'x';
describe('g', () => {
	const base = 'inner';
	test('[rule-a-valid-001] a', () => { use(derived, base); });
});
`;
		expect(one(spec('p'))).not.toBe(one(spec('q')));
	});
});

describe('what it refuses to guess', () => {
	test('a describe whose callback is not a function with a block', () => {
		expect(() => fingerprintSource('rule-a/index.spec.ts', "describe('g', () => test('a', () => {}));")).toThrow(
			/rule-a\/index\.spec\.ts:1/,
		);
		expect(() => fingerprintSource('rule-a/index.spec.ts', "describe('g', callback);")).toThrow(
			/rule-a\/index\.spec\.ts:1/,
		);
	});
});

describe('the report of a test', () => {
	test('its name, line, and the order of the file', () => {
		const tests = fingerprintSource('rule-a/index.spec.ts', BASE);
		expect(tests).toHaveLength(1);
		expect(tests[0]).toMatchObject({ name: '[rule-a-valid-001] name', line: 5 });
	});

	test('the name of a test written as a template literal keeps its ID at the start', () => {
		const [test] = fingerprintSource('rule-a/index.spec.ts', 'test(`[rule-a-valid-001] case ${x}`, () => {});');
		expect(test?.name).toBe('[rule-a-valid-001] case ${x}');
	});

	test('two tests that are the same in the body have the same hash', () => {
		const twin = "test('[rule-a-valid-001] a', () => { expect(1).toBe(1); });";
		const [first, second] = hashes(`${twin}\n${twin.replace('valid-001', 'valid-002')}`);
		expect(first).toBeDefined();
		expect(first).toBe(second);
	});

	test('the body hash is the same when only what runs around the test differs', () => {
		const alone = fingerprintSource('rule-a/index.spec.ts', BASE)[0];
		const hooked = fingerprintSource('rule-a/index.spec.ts', `beforeEach(() => setup());\n${BASE}`)[0];
		expect(alone?.body).toBeTypeOf('string');
		expect(hooked?.hash).not.toBe(alone?.hash);
		expect(hooked?.body).toBe(alone?.body);
	});
});
