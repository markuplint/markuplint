import { describe, expect, test } from 'vitest';

import {
	extractStringConstants,
	extractTranslatorTemplates,
	findUntranslatedMessages,
} from './translator-templates.js';

const templates = (source: string) => extractTranslatorTemplates(source).map(_ => _.template);

describe('extractTranslatorTemplates', () => {
	test('reads the first argument of a call to `t` written as a string literal', () => {
		expect(templates(`t('The "{0}" attribute', 'list'); t("a {0}", x);`)).toStrictEqual([
			'The "{0}" attribute',
			'a {0}',
		]);
	});

	test('keeps the no-translate mark so that the caller decides what to do with it', () => {
		expect(templates(`t('The "{0*}" {1}', name, 'attribute')`)).toStrictEqual(['The "{0*}" {1}']);
	});

	test('reads a template literal without a substitution', () => {
		expect(templates('t(`the {0} format`, x)')).toStrictEqual(['the {0} format']);
	});

	test('reads both branches of a conditional', () => {
		expect(templates(`t(ok ? '{0} must not {1}' : bad ? '{0} should not {1}' : '{0} is {1}', a, b)`)).toStrictEqual(
			['{0} must not {1}', '{0} should not {1}', '{0} is {1}'],
		);
	});

	test('looks through parentheses, `as` and `satisfies`', () => {
		expect(templates(`t(('a {0}'), x); t('b {0}' as const, x); t('c {0}' satisfies string, x)`)).toStrictEqual([
			'a {0}',
			'b {0}',
			'c {0}',
		]);
	});

	const MS = "const ms = severity === 'error' ? 'must' : 'should';";

	test('expands a substitution that is a constant of the file into every string it can be', () => {
		expect(templates(`${MS} t(\`{0} \${ms} be before {1}\`, a, b)`)).toStrictEqual([
			'{0} must be before {1}',
			'{0} should be before {1}',
		]);
	});

	test('reads a constant that is declared inside a function', () => {
		expect(templates(`function f() { ${MS} return t(\`{0} \${ms} be {1}\`, a, b); }`)).toStrictEqual([
			'{0} must be {1}',
			'{0} should be {1}',
		]);
	});

	test('expands every substitution of a template literal', () => {
		expect(templates(`${MS} t(\`\${ms} {0} \${ms}\`, a)`)).toStrictEqual([
			'must {0} must',
			'must {0} should',
			'should {0} must',
			'should {0} should',
		]);
	});

	test('skips a template whose substitution is not a string constant, whatever its name', () => {
		expect(templates('t(`${count}`); t(`{0} ${other} {1}`, a, b)')).toStrictEqual([]);
		expect(templates('const ms = 10; t(`wait ${ms}`, a)')).toStrictEqual([]);
		expect(templates('t(`{0} ${ms} be {1}`, a, b)')).toStrictEqual([]);
	});

	test('skips a list, a variable and a spread, which carry no template', () => {
		expect(templates(`t(['a', 'b']); t(variable); t(...args); t()`)).toStrictEqual([]);
	});

	test('reads a call that is an argument of another call, and a multi-line call', () => {
		expect(
			templates(`
				t(
					'{0} according to {1}',
					t('{0} does not exist', t('the "{0*}" {1}', raw, 'role')),
				)
			`),
		).toStrictEqual(['{0} according to {1}', '{0} does not exist', 'the "{0*}" {1}']);
	});

	test('ignores a method named `t` and other functions', () => {
		expect(templates(`obj.t('x'); at('y'); t2('z')`)).toStrictEqual([]);
	});

	test('reads the constant that a call passes as its template, from the same file', () => {
		expect(templates(`const MESSAGE = 'a {0}'; const OTHER = 'b'; t(MESSAGE, x); t(UNKNOWN, x)`)).toStrictEqual([
			'a {0}',
		]);
	});

	test('reads a constant of another file when it is given', () => {
		const constants = extractStringConstants(
			"export const WARNING =\n\t'a {0}' + '';\nexport const ERROR = `b {0}`;",
		);
		expect(extractTranslatorTemplates('t(ERROR, x); t(WARNING, x)', constants).map(_ => _.template)).toStrictEqual([
			'b {0}',
		]);
	});

	test('reads every string the arguments can be, and none for a value known only at run time', () => {
		const [found] = extractTranslatorTemplates(
			`t('{0} must be {1}', 'Import map', name, \`a string\`, cond ? 'x' : 'y', \`\${a}b\`)`,
		);
		expect(found?.args).toStrictEqual([['Import map'], [], ['a string'], ['x', 'y'], []]);
		expect(found?.argTexts).toStrictEqual(["'Import map'", 'name', '`a string`', "cond ? 'x' : 'y'", '`${a}b`']);
	});

	test('gives the arguments of every template that a constant expands to', () => {
		const found = extractTranslatorTemplates(`${MS} t(\`{0} \${ms} be {1}\`, a, "case")`);
		expect(found.map(_ => _.args)).toStrictEqual([
			[[], ['case']],
			[[], ['case']],
		]);
	});

	test('reports the 1-based line of the call, whatever the line ending', () => {
		expect(extractTranslatorTemplates(`\n\nt('a');\nt('b');`).map(_ => _.line)).toStrictEqual([3, 4]);
		expect(extractTranslatorTemplates(`\r\n\r\nt('a');\r\nt('b');`).map(_ => _.line)).toStrictEqual([3, 4]);
	});
});

describe('extractStringConstants', () => {
	test('reads the top-level constants that are strings, also those built from earlier ones', () => {
		const constants = extractStringConstants(`
			export const A = 'a';
			const B = cond ? 'b1' : 'b2';
			export const C = \`\${A}/c\`;
			let D = 'd';
			function f() { const E = 'e'; }
		`);
		expect([...constants]).toStrictEqual([
			['A', ['a']],
			['B', ['b1', 'b2']],
			['C', ['a/c']],
		]);
	});
});

describe('findUntranslatedMessages', () => {
	const locale = {
		sentences: {
			'the "{0}" {1}': '{1}「{0}」',
			'{0} must be {1}': '{0}は{1}であるべきです',
			'{0} is {1:c}': '{0}{1:c}',
			'{0} must be {0}': '{0}は{0}であるべきです',
		},
		keywords: { element: '要素', 'a string': '文字列', 'c:not allowed': 'は許可されていません', blue: '青' },
	};
	const find = (source: string) => findUntranslatedMessages(source, locale);

	test('passes a template with a sentence, comparing without the no-translate mark and in lower case', () => {
		expect(find(`t('The "{0*}" {1}', name, 'element')`)).toStrictEqual([]);
	});

	test('reports a template that has no sentence or keyword, with its line', () => {
		expect(find(`\nt('{0} is missing')`)).toStrictEqual(['2: {0} is missing']);
	});

	test('accepts a text without a placeholder that is a keyword', () => {
		expect(find(`t('element')`)).toStrictEqual([]);
	});

	test('reports a template that has a placeholder and only a keyword for it', () => {
		expect(find(`t('{0} element', x)`)).toStrictEqual(['1: {0} element']);
	});

	test('reports a string literal given for a translated placeholder that is no keyword', () => {
		expect(find(`t('{0} must be {1}', 'x', 'a number')`)).toStrictEqual([
			'1: {0} must be {1} — {0} "x" is not a keyword',
			'1: {0} must be {1} — {1} "a number" is not a keyword',
		]);
	});

	test('reports every string a conditional argument can be', () => {
		expect(find(`t('{0} must be {1}', 'element', ok ? 'a string' : 'a number')`)).toStrictEqual([
			'1: {0} must be {1} — {1} "a number" is not a keyword',
		]);
	});

	test('compares a value with the keywords in lower case', () => {
		expect(find(`t('{0} must be {1}', 'Element', 'A String')`)).toStrictEqual([]);
	});

	test('judges a placeholder used twice by every use, so one use without the mark is translated', () => {
		expect(find(`t('{0} must be {0*}', 'x')`)).toStrictEqual(['1: {0} must be {0*} — {0} "x" is not a keyword']);
		expect(find(`t('{0*} must be {0}', 'x')`)).toStrictEqual(['1: {0*} must be {0} — {0} "x" is not a keyword']);
	});

	test('accepts a literal that is a keyword, a no-translate placeholder, an escaped literal, and a complement keyword', () => {
		expect(find(`t('{0} must be {1}', 'element', 'a string')`)).toStrictEqual([]);
		expect(find(`t('{0*} must be {1*}', 'x', 'y')`)).toStrictEqual([]);
		expect(find(`t('{0} must be {1}', '%x%', '%y%')`)).toStrictEqual([]);
		expect(find(`t('{0} is {1:c}', 'element', 'not allowed')`)).toStrictEqual([]);
	});

	test('takes the plain keyword for a complement placeholder that has no complement keyword', () => {
		expect(find(`t('{0} is {1:c}', 'element', 'blue')`)).toStrictEqual([]);
		expect(find(`t('{0} is {1:c}', 'element', 'red')`)).toStrictEqual([
			'1: {0} is {1:c} — {1} "red" is not a keyword',
		]);
	});

	test('skips an empty or blank literal', () => {
		expect(find(`t('{0} must be {1}', '', '  ')`)).toStrictEqual([]);
	});

	test('reports an argument that is written like a name for a translated placeholder', () => {
		expect(find(`t('{0} must be {1}', el.localName, attr.name)`)).toStrictEqual([
			'1: {0} must be {1} — {0} el.localName is a name: write it as {0*}',
			'1: {0} must be {1} — {1} attr.name is a name: write it as {1*}',
		]);
		expect(find(`t('{0*} must be {1*}', el.localName, attr.name)`)).toStrictEqual([]);
		expect(find(`t('{0} must be {1}', renamed, count)`)).toStrictEqual([]);
	});

	test('reads a constant of the source or the given ones', () => {
		const constants = extractStringConstants(`export const WARNING = '{0} is missing';`);
		expect(findUntranslatedMessages('t(WARNING, x)', locale, constants)).toStrictEqual(['1: {0} is missing']);
	});

	test('takes a locale file that has no sentences or no keywords', () => {
		expect(findUntranslatedMessages(`t('a'); t('{0} b', x)`, {})).toStrictEqual(['1: a', '1: {0} b']);
		expect(findUntranslatedMessages(`t('element')`, { keywords: { element: '要素' } })).toStrictEqual([]);
	});
});
