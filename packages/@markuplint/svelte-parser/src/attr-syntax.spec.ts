// @ts-nocheck

import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

function attrsOf(code: string) {
	const ast = parser.parse(code);
	const el = ast.nodeList.find(node => node.type === 'starttag');
	return el.attributes;
}

describe('parser says what language an attribute value is written in', () => {
	test('JavaScript', () => {
		expect(parser.attrExpressionLanguage).toBe('javascript');
	});
});

describe('a single expression in quotes is an expression (Svelte 5)', () => {
	// "Quoting a singular expression does not affect how the value is parsed, but in Svelte 6 it will
	// cause the value to be coerced to a string" (https://svelte.dev/docs/svelte/basic-markup#Attributes-and-props)

	test.each([
		['disabled="{false}"', 'false'],
		["disabled='{false}'", 'false'],
		['title="{ x }"', ' x '],
		['title="{{ a: 1 }}"', '{ a: 1 }'],
	])('%s', (code, expression) => {
		const [attr] = attrsOf(`<button ${code}></button>`);
		expect(attr.isDynamicValue).toBe(true);
		expect(attr.potentialValue).toBe(expression);
		// The tokens are those of the source
		expect(attr.raw).toBe(code);
		expect(attr.name.raw).toBe(code.split('=')[0]);
	});

	test('the tokens of the source are kept', () => {
		const [attr] = attrsOf('<button disabled="{false}"></button>');
		expect(attr.startQuote.raw).toBe('"');
		expect(attr.value.raw).toBe('{false}');
		expect(attr.endQuote.raw).toBe('"');
	});

	test.each([
		['href="page/{p}"'],
		['href="{p}{q}"'],
		['href="{p} text"'],
		['href="text {p}"'],
		['href="{p}/"'],
		['title="plain"'],
		['title=""'],
	])('%s is a string', code => {
		const [attr] = attrsOf(`<a ${code}></a>`);
		expect(attr.isDynamicValue).toBeUndefined();
		expect(attr.potentialValue).toBeUndefined();
	});

	test('an unquoted expression is an expression', () => {
		const [attr] = attrsOf('<a href={p}></a>');
		expect(attr.isDynamicValue).toBe(true);
		expect(attr.startQuote.raw).toBe('{');
		expect(attr.potentialValue).toBeUndefined();
	});
});

describe('{@attach …} is not an attribute', () => {
	// "Attachments are functions that run in an effect when an element is mounted": a function that gets
	// the element can do anything to it, its attributes included, so it is read as a spread.

	test.each([
		['{@attach foo}'],
		['{@attach (el) => { el.x = 1 }}'],
		['{@attach false}'],
		['{@attach   foo}'],
		['{ @attach foo }'],
	])('%s', code => {
		const attrs = attrsOf(`<div ${code}></div>`);
		expect(attrs).toHaveLength(1);
		expect(attrs[0].type).toBe('spread');
		expect(attrs[0].nodeName).toBe('#spread');
		// The source as written, including the `@`
		expect(attrs[0].raw).toBe(code);
	});

	test('with attributes around it', () => {
		const attrs = attrsOf('<div a="1" {@attach foo} b="2"></div>');
		expect(attrs.map(a => a.type)).toStrictEqual(['attr', 'spread', 'attr']);
		expect(attrs[0].name.raw).toBe('a');
		expect(attrs[1].raw).toBe('{@attach foo}');
		expect(attrs[2].name.raw).toBe('b');
	});

	test.each([
		['{@attach (el) => el.setAttribute("a", "}")}'],
		["{@attach (el) => el.setAttribute('a', '}')}"],
		['{@attach (el) => el.setAttribute(`a`, `${"}"}`)}'],
		['{@attach (el) => { if (el) { el.x = 1 } }}'],
		['{@attach (el) => /}/.test(el.id)}'],
	])('%s ends at the brace that closes it', code => {
		const attrs = attrsOf(`<div ${code} b="2"></div>`);
		expect(attrs.map(a => a.type)).toStrictEqual(['spread', 'attr']);
		expect(attrs[0].raw).toBe(code);
		expect(attrs[1].name.raw).toBe('b');
	});

	test('an attribute that follows without a space is an attribute', () => {
		const attrs = attrsOf('<div {@attach foo}b="2"></div>');
		expect(attrs.map(a => a.type)).toStrictEqual(['spread', 'attr']);
		expect(attrs[0].raw).toBe('{@attach foo}');
		expect(attrs[1].name.raw).toBe('b');
	});

	test('the position is that of the source', () => {
		const attrs = attrsOf('<div a="1" {@attach foo}></div>');
		expect(attrs[1].offset).toBe(11);
		expect(attrs[1].line).toBe(1);
		expect(attrs[1].col).toBe(12);
	});

	test('an attachment that is not closed is a syntax error, as a spread that is not closed is', () => {
		expect(() => attrsOf('<div {@attach foo></div>')).toThrow();
		expect(() => attrsOf('<div {...foo></div>')).toThrow();
	});

	test('a shorthand is not an attachment', () => {
		const attrs = attrsOf('<div {attach}></div>');
		expect(attrs[0].type).toBe('attr');
		expect(attrs[0].potentialName).toBe('attach');
	});

	test('a spread is a spread', () => {
		const attrs = attrsOf('<div {...rest}></div>');
		expect(attrs[0].type).toBe('spread');
	});
});
