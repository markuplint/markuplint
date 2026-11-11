// @ts-nocheck

import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

function attrsOf(code: string) {
	const ast = parser.parse(code);
	const el = ast.nodeList.find(node => node.type === 'starttag');
	return el.attributes;
}

/**
 * "Tag attributes look similar to HTML (with optional commas), but their values are just regular JavaScript."
 * (https://pugjs.org/language/attributes.html) The parser records that a value is written as code, as it is
 * written; whether the code is a literal, and what Pug renders it as, is up to `@markuplint/ml-core`.
 */
describe('an attribute of Pug', () => {
	test('says that the language of the code is JavaScript', () => {
		expect(parser.attrExpressionLanguage).toBe('javascript');
	});

	test('without a value is true, and is not written as code', () => {
		const [attr] = attrsOf('input(disabled)');
		expect(attr.name.raw).toBe('disabled');
		expect(attr.equal.raw).toBe('');
		expect(attr.value.raw).toBe('');
		expect(attr.isDynamicValue).toBeUndefined();
	});

	test.each([
		['type="text"', '"text"'],
		["type='text'", "'text'"],
		['checked=true', 'true'],
		['value=0', '0'],
		['title=`a${b}`', '`a${b}`'],
		['data-x=foo', 'foo'],
		['data-x=foo.bar', 'foo.bar'],
		['data-x=a?1:2', 'a?1:2'],
		['title="a" + b', '"a" + b'],
		['title="a, b"', '"a, b"'],
		['title=")"', '")"'],
		["title='\"'", "'\"'"],
		['class=["a", "b"]', '["a", "b"]'],
	])('%s is code that is written as it is', (written, value) => {
		const [attr] = attrsOf(`input(${written})`);
		expect(attr.equal.raw).toBe('=');
		// The quotes of a string are a part of the code, as the quotes of the string of JavaScript
		expect(attr.startQuote.raw).toBe('');
		expect(attr.value.raw).toBe(value);
		expect(attr.endQuote.raw).toBe('');
		expect(attr.isDynamicValue).toBe(true);
		expect(attr.raw).toBe(written);
	});

	test.each([['type="text"'], ['checked=true'], ['value=0'], ['data-x=foo']])(
		'%s is code in the node, whatever its value is',
		written => {
			const [attr] = attrsOf(`input(${written})`);
			expect(attr.valueType).toBe('code');
		},
	);

	test('an expression that goes on after a string is one value', () => {
		const attrs = attrsOf('input(title=a+"x" value=0)');
		expect(attrs.map(a => a.value.raw)).toStrictEqual(['a+"x"', '0']);
	});

	test('&attributes is a spread', () => {
		const attrs = attrsOf('div(a="1")&attributes(attrs)');
		expect(attrs.map(a => [a.type, a.raw])).toStrictEqual([
			['attr', 'a="1"'],
			['spread', 'attrs'],
		]);
	});

	test('keeps the tokens of attributes that are separated by a comma or a space', () => {
		const attrs = attrsOf('input(disabled, type="text" checked=true, value=0)');
		expect(attrs.map(a => a.name.raw)).toStrictEqual(['disabled', 'type', 'checked', 'value']);
		expect(attrs.map(a => a.value.raw)).toStrictEqual(['', '"text"', 'true', '0']);
		expect(attrs.map(a => a.isDynamicValue)).toStrictEqual([undefined, true, true, true]);
	});

	test('on several lines', () => {
		const attrs = attrsOf('input(\n  type="text"\n  value=0\n)');
		expect(attrs.map(a => a.value.raw)).toStrictEqual(['"text"', '0']);
		expect(attrs.map(a => a.isDynamicValue)).toStrictEqual([true, true]);
	});

	test('the shorthand of the id and of the class is not code', () => {
		const attrs = attrsOf('div#main.a.b');
		expect(attrs.map(a => [a.potentialName, a.potentialValue, a.isDynamicValue])).toStrictEqual([
			['id', 'main', undefined],
			['class', 'a', undefined],
			['class', 'b', undefined],
		]);
	});

	test('a name in quotes, and an unescaped one, is the name without them', () => {
		const [quoted] = attrsOf(`a('data-value'="x")`);
		expect(quoted.potentialName).toBe('data-value');
		expect(quoted.isDynamicValue).toBe(true);
		const [unescaped] = attrsOf('a(href!="x")');
		expect(unescaped.potentialName).toBe('href');
		expect(unescaped.isDynamicValue).toBe(true);
	});

	test('class can be written more than once', () => {
		const attrs = attrsOf('div.a(class="b")');
		expect(attrs.map(a => a.isDuplicatable)).toStrictEqual([true, true]);
	});
});

describe('how Pug renders a literal', () => {
	test('is declared by the parser, as there is no spec package of it', () => {
		expect(parser.literalValues).toMatchObject({
			booleanAttrs: { '""': '', '0': '0' },
			otherAttrs: { true: '', false: null },
			attrs: { class: { '""': null, '0': null } },
		});
	});
});
