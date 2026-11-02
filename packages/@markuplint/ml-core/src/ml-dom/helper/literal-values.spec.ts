import type { LiteralRenderingContext } from './literal-values.js';
import type { LiteralExpression } from '@markuplint/parser-utils';

import { parseLiteralExpression } from '@markuplint/parser-utils';
import { describe, expect, test } from 'vitest';

import { getBooleanAttrNames, renderLiteral } from './literal-values.js';

const literal = (code: string): LiteralExpression => {
	const result = parseLiteralExpression(code);
	if (!result) {
		throw new Error(`Not a literal: ${code}`);
	}
	return result;
};

const render = (code: string, context: Partial<LiteralRenderingContext> & { name: string }) =>
	renderLiteral(literal(code), { isBoolean: false, isCustomElement: false, ...context });

const value = (v: string) => ({ kind: 'value', value: v });
const absent = { kind: 'absent' };
const unknown = { kind: 'unknown' };

describe('renderLiteral: the default of ml-core', () => {
	describe('a boolean attribute', () => {
		const boolean = { name: 'disabled', isBoolean: true };

		test.each([
			['true', value('')],
			['false', absent],
			['null', absent],
			['undefined', absent],
			['1', value('')],
			['42', value('')],
			['-1', value('')],
			['0', absent],
			['""', unknown],
			['"x"', value('')],
			['"true"', value('')],
			['"false"', value('')],
			['"0"', value('')],
		])('%s', (code, expected) => {
			expect(render(code, boolean)).toStrictEqual(expected);
		});
	});

	describe.each([['aria-busy'], ['data-state'], ['title']])('%s', name => {
		test.each([
			['true', value('true')],
			['false', value('false')],
			['null', absent],
			['undefined', absent],
			['1', value('1')],
			['0', value('0')],
			['-1', value('-1')],
			['1.5', value('1.5')],
			['""', value('')],
			['"x"', value('x')],
			['"true"', value('true')],
			['"0"', value('0')],
			['"a b"', value('a b')],
		])('%s', (code, expected) => {
			expect(render(code, { name })).toStrictEqual(expected);
		});
	});
});

describe('renderLiteral: the kind of an attribute', () => {
	test('aria- is the kind of ariaAttrs, and it does not fall back to otherAttrs', () => {
		const ctx = {
			name: 'aria-busy',
			specLiteralValues: { otherAttrs: { true: null }, ariaAttrs: { false: null } },
		};
		expect(render('true', ctx)).toStrictEqual(value('true'));
		expect(render('false', ctx)).toStrictEqual(absent);
	});

	test('data- is the kind of dataAttrs', () => {
		const ctx = { name: 'data-x', specLiteralValues: { dataAttrs: { true: '' }, otherAttrs: { true: null } } };
		expect(render('true', ctx)).toStrictEqual(value(''));
	});

	test('a boolean attribute is the kind of booleanAttrs', () => {
		const ctx = {
			name: 'disabled',
			isBoolean: true,
			specLiteralValues: { booleanAttrs: { '""': '' }, otherAttrs: { '""': null } },
		};
		expect(render('""', ctx)).toStrictEqual(value(''));
	});

	test('any other attribute is the kind of otherAttrs', () => {
		const ctx = { name: 'title', specLiteralValues: { otherAttrs: { true: null }, booleanAttrs: { true: 'b' } } };
		expect(render('true', ctx)).toStrictEqual(absent);
	});
});

describe('renderLiteral: the order of the tables', () => {
	const spec = { otherAttrs: { true: 'spec', false: 'spec' } };
	const parser = { otherAttrs: { true: 'parser', '0': 'parser' } };

	test('a spec wins over a parser on a key that both have', () => {
		const ctx = { name: 'title', specLiteralValues: spec, parserLiteralValues: parser };
		expect(render('true', ctx)).toStrictEqual(value('spec'));
	});

	test('a key that only the parser has is taken from the parser', () => {
		const ctx = { name: 'title', specLiteralValues: spec, parserLiteralValues: parser };
		expect(render('0', ctx)).toStrictEqual(value('parser'));
	});

	test('a key that no table has is rendered by the default', () => {
		const ctx = { name: 'title', specLiteralValues: spec, parserLiteralValues: parser };
		expect(render('1', ctx)).toStrictEqual(value('1'));
	});

	test('attrs of a spec, by the name of the attribute, wins over the kind', () => {
		const ctx = { name: 'title', specLiteralValues: { ...spec, attrs: { title: { true: 'attrs' } } } };
		expect(render('true', ctx)).toStrictEqual(value('attrs'));
		// the table is by key: a key that the table of the name lacks goes on to the kind
		expect(render('false', ctx)).toStrictEqual(value('spec'));
	});

	test('attrs is by the name, so another name is not affected', () => {
		const ctx = { name: 'lang', specLiteralValues: { attrs: { title: { true: 'attrs' } } } };
		expect(render('true', ctx)).toStrictEqual(value('true'));
	});

	test('the attrs of a parser win over the kind and over the default of the name', () => {
		const ctx = {
			name: 'hidden',
			parserLiteralValues: { attrs: { hidden: { '0': '0' } }, otherAttrs: { '0': 'kind' } },
		};
		expect(render('0', ctx)).toStrictEqual(value('0'));
	});

	test('attrs of a spec wins over attrs of a parser on a key that both have', () => {
		const ctx = {
			name: 'download',
			specLiteralValues: { attrs: { download: { true: 'spec' } } },
			parserLiteralValues: { attrs: { download: { true: 'parser', false: 'parser' } } },
		};
		expect(render('true', ctx)).toStrictEqual(value('spec'));
		expect(render('false', ctx)).toStrictEqual(value('parser'));
	});

	test('a null in a table is "not output", which is a value that wins', () => {
		const ctx = {
			name: 'title',
			specLiteralValues: { attrs: { title: { true: null } }, otherAttrs: { true: 'kind' } },
		};
		expect(render('true', ctx)).toStrictEqual(absent);
	});

	test('an inherited key of an object is not a key', () => {
		const ctx = { name: 'title', specLiteralValues: { otherAttrs: {} } };
		expect(render('"constructor"', ctx)).toStrictEqual(value('constructor'));
		expect(render('"toString"', ctx)).toStrictEqual(value('toString'));
		expect(render('"__proto__"', ctx)).toStrictEqual(value('__proto__'));
	});
});

describe('renderLiteral: hidden', () => {
	// `hidden` is an enumerated attribute in the spec, but the frameworks all take a boolean as present / absent
	test.each([
		['true', value('')],
		['false', absent],
		['0', absent],
		['null', absent],
		['undefined', absent],
		['""', value('')],
		['"until-found"', value('until-found')],
		['"hidden"', value('hidden')],
		['1', value('1')],
	])('%s', (code, expected) => {
		expect(render(code, { name: 'hidden' })).toStrictEqual(expected);
	});

	test('a spec says otherwise by attrs', () => {
		const ctx = { name: 'hidden', specLiteralValues: { attrs: { hidden: { true: 'true' } } } };
		expect(render('true', ctx)).toStrictEqual(value('true'));
		// a key that attrs lacks goes on to the default of the name
		expect(render('false', ctx)).toStrictEqual(absent);
	});
});

describe('renderLiteral: a custom element', () => {
	const specLiteralValues = {
		otherAttrs: { true: null },
		customElements: {
			booleanAttrs: { '0': '0' },
			ariaAttrs: { true: '' },
			attrs: { hidden: { false: 'false' } },
		},
	};
	const custom = { isCustomElement: true, specLiteralValues };

	test('overrides the table of the kind, by key', () => {
		expect(render('true', { name: 'aria-hidden', ...custom })).toStrictEqual(value(''));
	});

	test('overrides by name before the kind', () => {
		expect(render('false', { name: 'hidden', ...custom })).toStrictEqual(value('false'));
	});

	test('a key that the override lacks goes on to the ordinary tables', () => {
		expect(render('true', { name: 'title', ...custom })).toStrictEqual(absent);
		expect(render('false', { name: 'aria-hidden', ...custom })).toStrictEqual(value('false'));
	});

	test('an override of a boolean attribute', () => {
		expect(render('0', { name: 'disabled', isBoolean: true, ...custom })).toStrictEqual(value('0'));
	});

	test('is not applied to an element that is not a custom element', () => {
		expect(render('true', { name: 'aria-hidden', isCustomElement: false, specLiteralValues })).toStrictEqual(
			value('true'),
		);
	});

	test('the custom element of a parser is read after that of a spec', () => {
		const ctx = {
			name: 'aria-hidden',
			isCustomElement: true,
			specLiteralValues: { customElements: { ariaAttrs: { true: 'spec' } } },
			parserLiteralValues: { customElements: { ariaAttrs: { true: 'parser', false: 'parser' } } },
		};
		expect(render('true', ctx)).toStrictEqual(value('spec'));
		expect(render('false', ctx)).toStrictEqual(value('parser'));
	});

	test('the attrs of a custom element of a parser', () => {
		const ctx = {
			name: 'hidden',
			isCustomElement: true,
			parserLiteralValues: { customElements: { attrs: { hidden: { true: 'attrs' } } } },
		};
		expect(render('true', ctx)).toStrictEqual(value('attrs'));
	});
});

describe('getBooleanAttrNames', () => {
	const spec = (def: object, specs: readonly object[] = []) => ({ def: { '#globalAttrs': def }, specs }) as never;

	test('has the names whose type is Boolean in the global attributes and in an element', () => {
		const names = getBooleanAttrNames(
			spec({ '#HTMLGlobalAttrs': { autofocus: { type: 'Boolean' }, title: { type: 'Any' } } }, [
				{ name: 'details', attributes: { open: { type: 'Boolean' } } },
			]),
		);
		expect([...names].toSorted()).toStrictEqual(['autofocus', 'open']);
	});

	test('has a name whose type is an array that has Boolean', () => {
		const names = getBooleanAttrNames(
			spec({}, [{ name: 'x', attributes: { a: { type: ['Boolean', 'Any'] }, b: { type: ['Any'] } } }]),
		);
		expect([...names]).toStrictEqual(['a']);
	});

	test('has a name whose conditional type has Boolean', () => {
		const names = getBooleanAttrNames(
			spec({}, [
				{
					name: 'input',
					attributes: {
						checked: { type: [{ condition: '[type=checkbox]', type: 'Boolean' }] },
						value: { type: [{ condition: '[type=color]', type: ['<color>'] }] },
					},
				},
			]),
		);
		expect([...names]).toStrictEqual(['checked']);
	});

	test('has a name that is Boolean in one element and not in another', () => {
		const names = getBooleanAttrNames(
			spec({}, [
				{ name: 'details', attributes: { open: { type: 'Boolean' } } },
				{ name: 'mfenced', attributes: { open: { type: 'Any' } } },
			]),
		);
		expect([...names]).toStrictEqual(['open']);
	});

	test('has the lower-case of a name', () => {
		const names = getBooleanAttrNames(
			spec({}, [{ name: 'input', attributes: { defaultChecked: { type: 'Boolean' } } }]),
		);
		expect(names.has('defaultchecked')).toBe(true);
	});

	test('has not a name of an enumerated type', () => {
		const names = getBooleanAttrNames(
			spec({ '#HTMLGlobalAttrs': { hidden: { type: { enum: ['', 'hidden', 'until-found'] } } } }),
		);
		expect(names.has('hidden')).toBe(false);
	});

	test('is computed once for a spec', () => {
		const s = spec({ '#HTMLGlobalAttrs': { autofocus: { type: 'Boolean' } } });
		expect(getBooleanAttrNames(s)).toBe(getBooleanAttrNames(s));
	});
});
