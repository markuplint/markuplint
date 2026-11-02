import type { MLElement } from './element.js';
import type { MLParser } from '@markuplint/ml-ast';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createRule } from '../../ml-rule/create-test-rule.js';
import { createTestDocument, createTestElement } from '../../test/index.js';

/**
 * A literal in an attribute value that is written as code is rendered as the framework renders it,
 * by `@markuplint/ml-core`, from what the parser says (`attrExpressionLanguage`) and what the spec
 * says (`literalValues`). The parsers and the specs of the frameworks are in their own packages.
 */

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

async function vueParser(): Promise<MLParser> {
	return (await import('@markuplint/vue-parser')).parser;
}

async function svelteParser(): Promise<MLParser> {
	return (await import('@markuplint/svelte-parser')).parser;
}

async function svelteSpecs() {
	return withSpec((await import('@markuplint/svelte-spec')).default as ExtendedSpec);
}

async function astroParser(): Promise<MLParser> {
	return (await import('@markuplint/astro-parser')).parser;
}

function withSpec(...extended: ExtendedSpec[]) {
	return schemaToSpec([htmlSpec as unknown as MLMLSpec, ...extended]);
}

function attr(el: MLElement<any, any>, name: string) {
	const found = el.attributes.find(a => a.name === name);
	if (!found) {
		throw new TypeError(`No attribute ${name}`);
	}
	return found;
}

/** The state of an attribute that is rendered to a value. */
const rendered = (value: string) => ({ value, isDynamicValue: undefined, isAbsent: undefined, valueType: 'string' });

/** The state of an attribute that the framework does not output. */
const absent = { value: '', isDynamicValue: true, isAbsent: true, valueType: 'string' };

/** The state of an attribute whose value is not known. */
const unknown = (value: string) => ({ value, isDynamicValue: true, isAbsent: undefined, valueType: 'string' });

function state(el: MLElement<any, any>, name: string) {
	const a = attr(el, name);
	return { value: a.value, isDynamicValue: a.isDynamicValue, isAbsent: a.isAbsent, valueType: a.valueType };
}

describe('JSX: a literal in {…} is rendered by the default of ml-core', () => {
	test.each([
		['aria-busy={true}', 'aria-busy', rendered('true')],
		['aria-busy={"true"}', 'aria-busy', rendered('true')],
		["aria-busy={'true'}", 'aria-busy', rendered('true')],
		['aria-busy={`true`}', 'aria-busy', rendered('true')],
		['aria-busy={false}', 'aria-busy', rendered('false')],
		['aria-busy={"not-a-value"}', 'aria-busy', rendered('not-a-value')],
		['aria-busy={null}', 'aria-busy', absent],
		['aria-busy={undefined}', 'aria-busy', absent],
		['aria-valuenow={0}', 'aria-valuenow', rendered('0')],
		['aria-valuenow={42}', 'aria-valuenow', rendered('42')],
		['aria-valuenow={-1}', 'aria-valuenow', rendered('-1')],
		['aria-valuenow={0x10}', 'aria-valuenow', rendered('16')],
		['title={true}', 'title', rendered('true')],
		['title={""}', 'title', rendered('')],
		['title={0}', 'title', rendered('0')],
		['data-x={false}', 'data-x', rendered('false')],
	])('%s', async (code, name, expected) => {
		const el = createTestElement(`<div ${code}></div>`, { parser: await jsxParser() });
		expect(state(el, name)).toStrictEqual(expected);
	});

	test('a boolean attribute is present for true and not output for false', async () => {
		const parser = await jsxParser();
		expect(state(createTestElement('<button disabled={true}></button>', { parser }), 'disabled')).toStrictEqual(
			rendered(''),
		);
		expect(state(createTestElement('<button disabled={false}></button>', { parser }), 'disabled')).toStrictEqual(
			absent,
		);
		expect(state(createTestElement('<button disabled={null}></button>', { parser }), 'disabled')).toStrictEqual(
			absent,
		);
		expect(state(createTestElement('<button disabled={0}></button>', { parser }), 'disabled')).toStrictEqual(
			absent,
		);
		expect(state(createTestElement('<button disabled={1}></button>', { parser }), 'disabled')).toStrictEqual(
			rendered(''),
		);
		expect(state(createTestElement('<button disabled={"x"}></button>', { parser }), 'disabled')).toStrictEqual(
			rendered(''),
		);
	});

	test('the empty string on a boolean attribute is not known unless the spec says', async () => {
		const el = createTestElement('<button disabled={""}></button>', { parser: await jsxParser() });
		expect(state(el, 'disabled')).toStrictEqual(unknown(''));
		expect(attr(el, 'disabled').isAbsent).toBeUndefined();
	});

	test.each([
		['x'],
		['a ? "x" : "y"'],
		['`a${b}`'],
		['foo()'],
		['"a" + b'],
		['[1]'],
		['{ a: 1 }'],
		['void 0'],
		['NaN'],
	])('a non-literal expression %s is dynamic and keeps the text of the expression', async code => {
		const el = createTestElement(`<div title={${code}}></div>`, { parser: await jsxParser() });
		expect(state(el, 'title')).toStrictEqual({
			value: code,
			isDynamicValue: true,
			isAbsent: undefined,
			valueType: 'string',
		});
		expect(attr(el, 'title').literal).toBeNull();
	});

	test('a static string is not an expression', async () => {
		const el = createTestElement('<div title="x"></div>', { parser: await jsxParser() });
		expect(state(el, 'title')).toStrictEqual(rendered('x'));
		expect(attr(el, 'title').isExpressionValue).toBeUndefined();
	});

	test('a literal is written as code (isExpressionValue) and a rendered value is not dynamic', async () => {
		const el = createTestElement('<div aria-busy={true}></div>', { parser: await jsxParser() });
		const a = attr(el, 'aria-busy');
		expect(a.isExpressionValue).toBe(true);
		expect(a.isDynamicValue).toBeUndefined();
		expect(a.literal).toStrictEqual({ type: 'boolean', value: true, key: 'true' });
	});

	test('the same value written in either way is the same attribute value', async () => {
		const parser = await jsxParser();
		const direct = createTestElement('<div role="checkbox"></div>', { parser });
		const literal = createTestElement('<div role={"checkbox"}></div>', { parser });
		expect(attr(direct, 'role').value).toBe(attr(literal, 'role').value);
		expect(attr(literal, 'role').tokenList?.toString()).toBe('checkbox');
	});

	test('an absent attribute has no token list', async () => {
		const el = createTestElement('<div role={null}></div>', { parser: await jsxParser() });
		expect(attr(el, 'role').tokenList).toBeNull();
	});
});

describe('JSX: the shorthand of a boolean value is the literal true', () => {
	test.each([
		['<div aria-hidden></div>', 'aria-hidden', rendered('true')],
		['<button disabled></button>', 'disabled', rendered('')],
		['<div title></div>', 'title', rendered('true')],
		['<div data-x></div>', 'data-x', rendered('true')],
	])('%s', async (code, name, expected) => {
		const el = createTestElement(code, { parser: await jsxParser() });
		expect(state(el, name)).toStrictEqual(expected);
		expect(attr(el, name).isExpressionValue).toBeUndefined();
		expect(attr(el, name).literal).toStrictEqual({ type: 'boolean', value: true, key: 'true' });
	});

	test('an empty value that is written is not the shorthand', async () => {
		const el = createTestElement('<div aria-hidden=""></div>', { parser: await jsxParser() });
		expect(state(el, 'aria-hidden')).toStrictEqual({
			value: '',
			isDynamicValue: undefined,
			isAbsent: undefined,
			valueType: 'string',
		});
		expect(attr(el, 'aria-hidden').literal).toBeNull();
	});

	test('an HTML document does not take a valueless attribute as true', () => {
		const el = createTestElement('<div aria-hidden></div>');
		expect(attr(el, 'aria-hidden').value).toBe('');
		expect(attr(el, 'aria-hidden').literal).toBeNull();
	});
});

describe('JSX: the spec says how a literal is rendered', () => {
	const specs = withSpec({
		// As React does: the names of the IDL (`contentEditable`) are resolved to the names of the content attributes
		acceptedAttrNames: 'idl',
		literalValues: {
			booleanAttrs: { '""': null },
			otherAttrs: { true: null, false: null },
			attrs: {
				contenteditable: { true: 'true', false: 'false' },
				spellcheck: { true: 'true', false: 'false' },
			},
			customElements: { ariaAttrs: { true: '' }, attrs: { hidden: { false: 'false' } } },
		},
	});

	test('the table of the kind of the attribute', async () => {
		const parser = await jsxParser();
		expect(
			state(createTestElement('<button disabled={""}></button>', { parser, specs }), 'disabled'),
		).toStrictEqual(absent);
		expect(state(createTestElement('<div title={true}></div>', { parser, specs }), 'title')).toStrictEqual(absent);
		expect(state(createTestElement('<div title={false}></div>', { parser, specs }), 'title')).toStrictEqual(absent);
		// aria- is of another kind, and the table of otherAttrs is not read
		expect(state(createTestElement('<div aria-busy={true}></div>', { parser, specs }), 'aria-busy')).toStrictEqual(
			rendered('true'),
		);
	});

	test('the table of the name of the attribute', async () => {
		const parser = await jsxParser();
		const el = createTestElement('<div contenteditable={true}></div>', { parser, specs });
		expect(state(el, 'contenteditable')).toStrictEqual(rendered('true'));
		expect(
			state(createTestElement('<div contentEditable={false}></div>', { parser, specs }), 'contenteditable'),
		).toStrictEqual(rendered('false'));
		expect(
			state(createTestElement('<div spellcheck={false}></div>', { parser, specs }), 'spellcheck'),
		).toStrictEqual(rendered('false'));
	});

	test('a key that the table of the name lacks is rendered by the kind', async () => {
		const el = createTestElement('<div contenteditable={null}></div>', { parser: await jsxParser(), specs });
		expect(state(el, 'contenteditable')).toStrictEqual(absent);
	});

	test('the name that the spec knows is the name of the DOM (an IDL name is resolved)', async () => {
		const el = createTestElement('<div contentEditable={true}></div>', { parser: await jsxParser(), specs });
		expect(attr(el, 'contenteditable').value).toBe('true');
	});

	test('a custom element is rendered by the table of customElements first', async () => {
		const parser = await jsxParser();
		expect(
			state(createTestElement('<x-el aria-hidden={true}></x-el>', { parser, specs }), 'aria-hidden'),
		).toStrictEqual(rendered(''));
		expect(state(createTestElement('<x-el hidden={false}></x-el>', { parser, specs }), 'hidden')).toStrictEqual(
			rendered('false'),
		);
		// the same on an element of HTML
		expect(
			state(createTestElement('<div aria-hidden={true}></div>', { parser, specs }), 'aria-hidden'),
		).toStrictEqual(rendered('true'));
		// a key that customElements lacks goes on to the ordinary tables
		expect(state(createTestElement('<x-el title={true}></x-el>', { parser, specs }), 'title')).toStrictEqual(
			absent,
		);
	});
});

describe('JSX: the parser declares how a literal is rendered when it has no spec', () => {
	/** The parser of the language with the settings of the document that it declares. */
	function declaring(base: MLParser, literalValues: MLParser['literalValues']): MLParser {
		return {
			parse: (...args) => base.parse(...args),
			endTag: base.endTag,
			booleanish: base.booleanish,
			attrExpressionLanguage: base.attrExpressionLanguage,
			tagNameCaseSensitive: base.tagNameCaseSensitive,
			attrNameCaseSensitive: base.attrNameCaseSensitive,
			attrNameRoute: base.attrNameRoute,
			isComponentName: name => base.isComponentName?.(name) ?? false,
			literalValues,
		};
	}

	test('the table of a parser, and the spec wins over it', async () => {
		const parser = declaring(await jsxParser(), { otherAttrs: { true: 'parser', false: 'parser' } });
		const specs = withSpec({ literalValues: { otherAttrs: { true: 'spec' } } });
		const el = createTestElement('<div title={true} lang={false}></div>', { parser, specs });
		expect(attr(el, 'title').value).toBe('spec');
		expect(attr(el, 'lang').value).toBe('parser');
	});

	test('the attrs of a parser, by the name of an attribute', async () => {
		const parser = declaring(await jsxParser(), { attrs: { title: { true: 'by-name' } } });
		const el = createTestElement('<div title={true} lang={true}></div>', { parser });
		expect(attr(el, 'title').value).toBe('by-name');
		expect(attr(el, 'lang').value).toBe('true');
	});
});

describe('A component keeps the literal that it receives, which is rendered by the element it goes to', () => {
	test.each([
		['label={false}', 'label', 'false'],
		['label={true}', 'label', 'true'],
		['label={null}', 'label', ''],
		['label={undefined}', 'label', ''],
		['label={0}', 'label', '0'],
		['label={"x"}', 'label', 'x'],
		['label={""}', 'label', ''],
	])('%s', async (code, name, value) => {
		const el = createTestElement(`<Btn ${code} />`, { parser: await jsxParser() });
		expect(state(el, name)).toStrictEqual(rendered(value));
		expect(attr(el, name).isAbsent).toBeUndefined();
		expect(attr(el, name).isExpressionValue).toBe(true);
	});

	test('the shorthand on a component is the prop true', async () => {
		const el = createTestElement('<Btn open />', { parser: await jsxParser() });
		expect(state(el, 'open')).toStrictEqual(rendered('true'));
	});
});

describe('Vue: the value of v-bind', () => {
	test.each([
		[':aria-busy="true"', 'aria-busy', rendered('true')],
		['v-bind:aria-busy="false"', 'aria-busy', rendered('false')],
		[':title="\'x\'"', 'title', rendered('x')],
		[':title="null"', 'title', absent],
		[':title="0"', 'title', rendered('0')],
	])('%s', async (code, name, expected) => {
		const el = createTestElement(`<template><div ${code}></div></template>`, {
			parser: await vueParser(),
			specs: withSpec((await import('@markuplint/vue-spec')).default as ExtendedSpec),
		});
		expect(state(el, name)).toStrictEqual(expected);
	});

	test('a boolean attribute and the empty string are present, as Vue says', async () => {
		const parser = await vueParser();
		const specs = withSpec((await import('@markuplint/vue-spec')).default as ExtendedSpec);
		const el = createTestElement('<template><button :disabled=\'""\'></button></template>', { parser, specs });
		expect(state(el, 'disabled')).toStrictEqual(rendered(''));
		const off = createTestElement('<template><button :disabled="false"></button></template>', { parser, specs });
		expect(state(off, 'disabled')).toStrictEqual(absent);
	});

	test('the same-name shorthand has no value and is not the empty string', async () => {
		const el = createTestElement('<template><button :disabled></button></template>', {
			parser: await vueParser(),
			specs: withSpec((await import('@markuplint/vue-spec')).default as ExtendedSpec),
		});
		const a = attr(el, 'disabled');
		expect(a.literal).toBeNull();
		expect(a.isDynamicValue).toBe(true);
		expect(a.isAbsent).toBeUndefined();
	});

	test.each([
		[':class="{ a: b }"', 'class'],
		[':class="[\'a\']"', 'class'],
		[':style="{ color: c }"', 'style'],
		[':title.prop="true"', ':title.prop'],
		[':title.camel="true"', ':title.camel'],
		[':[name]="true"', ':[name]'],
		['v-bind="{ title: true }"', 'v-bind'],
	])('%s is not a literal', async (code, name) => {
		const el = createTestElement(`<template><div ${code}></div></template>`, {
			parser: await vueParser(),
			specs: withSpec((await import('@markuplint/vue-spec')).default as ExtendedSpec),
		});
		expect(
			[...el.attributes].map(a => ({ name: a.name, literal: a.literal, isDynamicValue: a.isDynamicValue })),
		).toStrictEqual([{ name, literal: null, isDynamicValue: true }]);
	});
});

describe('Svelte', () => {
	test.each([
		['aria-busy={true}', 'aria-busy', rendered('true')],
		['aria-busy={false}', 'aria-busy', rendered('false')],
		['title={"x"}', 'title', rendered('x')],
		['title={null}', 'title', absent],
	])('%s', async (code, name, expected) => {
		const el = createTestElement(`<div ${code}></div>`, {
			parser: await svelteParser(),
			specs: await svelteSpecs(),
		});
		expect(state(el, name)).toStrictEqual(expected);
	});

	test('a single expression in quotes is an expression (Svelte 5)', async () => {
		const el = createTestElement('<button disabled="{false}"></button>', {
			parser: await svelteParser(),
			specs: await svelteSpecs(),
		});
		expect(state(el, 'disabled')).toStrictEqual(absent);
		expect(attr(el, 'disabled').isExpressionValue).toBe(true);
	});

	test('an expression in a string is a string and not a literal', async () => {
		const el = createTestElement('<a href="page/{p}"></a>', { parser: await svelteParser() });
		expect(attr(el, 'href').isExpressionValue).toBeUndefined();
		expect(attr(el, 'href').literal).toBeNull();
		expect(attr(el, 'href').value).toBe('page/{p}');
	});

	test.each([
		['class:active={true}', 'class'],
		["style:color={'red'}", 'style'],
		['bind:value={true}', 'value'],
		['{...rest}', '#spread'],
	])('%s is not a literal', async (code, name) => {
		const el = createTestElement(`<div ${code}></div>`, {
			parser: await svelteParser(),
			specs: await svelteSpecs(),
		});
		expect(
			[...el.attributes].map(a => ({ name: a.name, literal: a.literal, isDynamicValue: a.isDynamicValue })),
		).toStrictEqual([{ name, literal: null, isDynamicValue: true }]);
	});

	test('a class that is an object or an array is not a literal', async () => {
		const el = createTestElement("<div class={['a', 'b']}></div>", { parser: await svelteParser() });
		expect(attr(el, 'class').literal).toBeNull();
		expect(attr(el, 'class').isDynamicValue).toBe(true);
	});
});

describe('Astro', () => {
	test.each([
		['aria-busy={true}', 'aria-busy', rendered('true')],
		['title={"x"}', 'title', rendered('x')],
		['title={null}', 'title', absent],
	])('%s', async (code, name, expected) => {
		const el = createTestElement(`<div ${code}></div>`, { parser: await astroParser() });
		expect(state(el, name)).toStrictEqual(expected);
	});

	test('class:list is not a literal', async () => {
		const el = createTestElement('<div class:list={true}></div>', { parser: await astroParser() });
		expect(attr(el, 'class').literal).toBeNull();
		expect(attr(el, 'class').isDynamicValue).toBe(true);
	});
});

describe('An attribute of a parser that does not say its language is not read as a literal', () => {
	test('the HTML parser', () => {
		const el = createTestElement('<div title="{true}"></div>');
		expect(attr(el, 'title').literal).toBeNull();
		expect(attr(el, 'title').value).toBe('{true}');
	});

	test('a directive pattern without a language', () => {
		const specs = withSpec({
			directivePatterns: [
				{ pattern: '^:([^.]+)$', potentialName: '$1', isDynamicValue: true, valueType: 'code' },
			],
		});
		const el = createTestElement('<div :title="true"></div>', { specs });
		const a = attr(el, 'title');
		expect(a.literal).toBeNull();
		expect(a.valueType).toBe('code');
		expect(a.isDynamicValue).toBe(true);
	});

	test('a directive pattern with a language', () => {
		const specs = withSpec({
			directivePatterns: [
				{
					pattern: '^:([^.]+)$',
					potentialName: '$1',
					isDynamicValue: true,
					valueType: 'code',
					expressionLanguage: 'javascript',
				},
			],
		});
		const el = createTestElement('<div :title="true"></div>', { specs });
		expect(state(el, 'title')).toStrictEqual(rendered('true'));
	});
});

describe('isSetThroughDOMAPI is decided by how the attribute is written', () => {
	test('a literal in {…} in Svelte is still set through the DOM API', async () => {
		const el = createTestElement('<svg VIEWBOX={"0 0 1 1"}></svg>', { parser: await svelteParser() });
		expect(attr(el, 'VIEWBOX').isSetThroughDOMAPI).toBe(true);
	});
});

describe('the rendering of an attribute depends on the type of its owner element', () => {
	test('is not kept while the owner element has no type, and is kept once it has', async () => {
		const el = createTestElement('<button disabled={true}></button>', { parser: await jsxParser() });
		let type: string | undefined;
		Object.defineProperty(el, 'elementType', { configurable: true, get: () => type });
		const a = attr(el, 'disabled');

		// An element of HTML renders `true` of a boolean attribute as present; a component receives it as a prop
		type = undefined;
		expect(a.value).toBe('');
		type = 'authored';
		expect(a.value).toBe('true');

		// Once it has a type the rendering is kept
		type = 'html';
		expect(a.value).toBe('true');
	});
});

describe('the position of a token in a value written as code', () => {
	// The rendered value (`foo bar`) is not the source (`"foo bar"`, `'f\\u006fo'`). The token keeps its text, so a
	// rule judges it as it judges a token of a string. Its position is exact when the literal is a string of the
	// same characters in quotes, and is the start of the literal when an escape or another notation makes the
	// offsets differ.

	/** Runs `check` on the attribute `role` of the first `div`, in the evaluation of a rule, as `pick` is. */
	async function onRole(
		code: string,
		check: (a: ReturnType<typeof attr>) => void,
		parser: () => Promise<MLParser> = jsxParser,
		specs?: ReturnType<typeof withSpec>,
	) {
		const document = createTestDocument(code, { parser: await parser(), ...(specs ? { specs } : {}) });
		const rule = createRule({
			name: 'test-rule',
			defaultValue: true,
			verify({ document }) {
				const el = document.querySelector('div');
				if (!el) {
					throw new TypeError('No div');
				}
				check(attr(el, 'role'));
			},
		});
		await rule.verify(document, { locale: 'en' }, false);
	}

	/** The position of a token, which is what a rule reports. */
	const at = (raw: string, startOffset: number, startLine: number, startCol: number) => ({
		raw,
		startOffset,
		startLine,
		startCol,
	});

	test('is exact for a string in quotes', async () => {
		expect.assertions(2);
		// <div role={"foo bar"}> : the `"` is at 11
		await onRole('<div role={"foo bar"}></div>', a => {
			expect(a.tokenList?.pick('foo')).toMatchObject(at('foo', 12, 1, 13));
			expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 16, 1, 17));
		});
	});

	test.each([["'"], ['`']])('is exact for a string in %s', async quote => {
		expect.assertions(1);
		await onRole(`<div role={${quote}foo bar${quote}}></div>`, a => {
			expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 16, 1, 17));
		});
	});

	test('is exact for a string in quotes in Svelte', async () => {
		expect.assertions(1);
		await onRole(
			"<div role={'foo bar'}></div>",
			a => {
				expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 16, 1, 17));
			},
			svelteParser,
		);
	});

	test('is exact for a string in quotes in a binding of Vue', async () => {
		expect.assertions(1);
		// <template><div :role="'foo bar'"> : the `'` is at 22
		await onRole(
			'<template><div :role="\'foo bar\'"></div></template>',
			a => {
				expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 27, 1, 28));
			},
			vueParser,
			withSpec((await import('@markuplint/vue-spec')).default as ExtendedSpec),
		);
	});

	test('is exact on a line after the first of a template literal', async () => {
		expect.assertions(1);
		// `bar` is the first token of the second line: the column does not take the quote of the first line
		await onRole('<div role={`foo\nbar baz`}></div>', a => {
			expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 16, 2, 1));
		});
	});

	test('is the start of the literal when the lines end with CRLF, which a template literal reads as LF', async () => {
		expect.assertions(1);
		await onRole('<div role={`foo\r\nbar baz`}></div>', a => {
			expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 11, 1, 12));
		});
	});

	test('is the start of the literal when the source has an escape', async () => {
		expect.assertions(2);
		await onRole('<div role={"a\\u0062c"}></div>', a => {
			expect(a.value).toBe('abc');
			expect(a.tokenList?.pick('abc')).toMatchObject(at('abc', 11, 1, 12));
		});
	});

	test('is the start of the literal when the string is wrapped', async () => {
		expect.assertions(1);
		await onRole('<div role={("foo")}></div>', a => {
			expect(a.tokenList?.pick('foo')).toMatchObject(at('foo', 11, 1, 12));
		});
	});

	test('of a static value on a line after the first is the column in the line', async () => {
		expect.assertions(1);
		await onRole('<div role="foo\nbar"></div>', a => {
			expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 15, 2, 1));
		});
	});

	test('of a static value is the token itself', async () => {
		expect.assertions(1);
		await onRole('<div role="foo bar"></div>', a => {
			expect(a.tokenList?.pick('bar')).toMatchObject(at('bar', 15, 1, 16));
		});
	});

	test('allTokens has the text and the location of each token', async () => {
		expect.assertions(1);
		await onRole('<div role={"foo bar"}></div>', a => {
			expect(a.tokenList?.allTokens().map(scope => [scope.raw, scope.startOffset])).toStrictEqual([
				['foo', 12],
				['bar', 16],
			]);
		});
	});
});
