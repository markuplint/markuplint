import type { MLElement } from './ml-dom/node/element.js';
import type { MLParser } from '@markuplint/ml-ast';
import type { Pretender } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createRule } from './ml-rule/create-test-rule.js';
import { createTestDocument } from './test/index.js';

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

async function vueParser(): Promise<MLParser> {
	return (await import('@markuplint/vue-parser')).parser;
}

const specs = schemaToSpec([htmlSpec as unknown as MLMLSpec, { acceptedAttrNames: 'idl' } as ExtendedSpec]);

function pretenderOf(el: MLElement<any, any> | null) {
	const context = el?.pretenderContext;
	if (context?.type !== 'pretender') {
		throw new TypeError('Not a pretender');
	}
	return context.as;
}

function stateOf(el: MLElement<any, any>, name: string) {
	const attr = el.attributes.find(a => a.name === name);
	if (!attr) {
		throw new TypeError(`No attribute ${name}`);
	}
	return {
		value: attr.value,
		isDynamicValue: attr.isDynamicValue,
		isAbsent: attr.isAbsent,
		isPretended: attr.isPretended,
	};
}

const rendered = (value: string) => ({
	value,
	isDynamicValue: undefined,
	isAbsent: undefined,
	isPretended: true,
});
const absent = { value: '', isDynamicValue: true, isAbsent: true, isPretended: true };

describe('a pretender attribute of { expression }', () => {
	const asButton = (attrs: Pretender['as']): readonly Pretender[] => [{ selector: 'Btn', as: attrs }];

	test.each([
		['true', 'aria-busy', rendered('true')],
		['false', 'aria-busy', rendered('false')],
		['"true"', 'aria-busy', rendered('true')],
		["'x'", 'title', rendered('x')],
		['`x`', 'title', rendered('x')],
		['0', 'aria-valuenow', rendered('0')],
		['42', 'tabindex', rendered('42')],
		['null', 'title', absent],
		['undefined', 'title', absent],
		['true', 'disabled', rendered('')],
		['false', 'disabled', absent],
		['0', 'disabled', absent],
	])('%s on %s', async (expression, name, expected) => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: asButton({ element: 'button', attrs: [{ name, value: { expression } }] }),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, name)).toStrictEqual(expected);
	});

	test('code that is not a literal is dynamic', async () => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: asButton({
				element: 'button',
				attrs: [{ name: 'tabindex', value: { expression: 'selected ? 0 : -1' } }],
			}),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		const state = stateOf(as, 'tabindex');
		expect(state.isDynamicValue).toBe(true);
		expect(state.isAbsent).toBeUndefined();
	});

	test.each([
		// React sets `true` on any attribute of a custom element as an empty string
		['x-el', ''],
		['div', 'true'],
	])('the element %s that a pretender stands for is rendered as React renders it', async (element, expected) => {
		const react = schemaToSpec([
			htmlSpec as unknown as MLMLSpec,
			(await import('@markuplint/react-spec')).default as ExtendedSpec,
		]);
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs: react,
			pretenders: asButton({ element, attrs: [{ name: 'aria-hidden', value: { expression: 'true' } }] }),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'aria-hidden').value).toBe(expected);
	});

	test('is read as JavaScript whatever the language of the document is', () => {
		const document = createTestDocument('<x-btn></x-btn>', {
			specs,
			pretenders: [
				{
					selector: 'x-btn',
					as: { element: 'button', attrs: [{ name: 'disabled', value: { expression: 'false' } }] },
				},
			],
		});
		const as = pretenderOf(document.querySelector('x-btn'));
		expect(stateOf(as, 'disabled')).toStrictEqual(absent);
	});

	test('is not found by name when it is absent, as an attribute that the DOM does not have', async () => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: asButton({ element: 'button', attrs: [{ name: 'disabled', value: { expression: 'false' } }] }),
		});
		const el = document.querySelector('Btn');
		// An element that is a pretender is asked as the element that it pretends to be
		expect(el?.hasAttribute('disabled')).toBe(false);
		expect(el?.getAttribute('disabled')).toBeNull();
		expect(el?.getAttributeToken('disabled')).toHaveLength(0);
		expect(document.querySelector('Btn[disabled]')).toBeNull();
		// The list of the attributes has it: a name that is misspelled is reported whatever its value is
		expect(el?.getAttributeTokens().map(attr => attr.name)).toStrictEqual(['disabled']);
		expect(el?.getAttributeNames()).toStrictEqual([]);
		expect(el?.hasAttributes()).toBe(false);
	});

	test('a string value is the value of the attribute', async () => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: asButton({
				element: 'button',
				attrs: [{ name: 'type', value: 'button' }, { name: 'disabled' }],
			}),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'type')).toStrictEqual({
			value: 'button',
			isDynamicValue: undefined,
			isAbsent: undefined,
			isPretended: true,
		});
		expect(stateOf(as, 'disabled')).toStrictEqual({
			value: '',
			isDynamicValue: undefined,
			isAbsent: undefined,
			isPretended: true,
		});
	});

	test('an empty string and a boolean of a pretender are not the shorthand of JSX, which is `true`', async () => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: asButton({
				element: 'img',
				attrs: [{ name: 'alt', value: '' }, { name: 'title' }, { name: 'aria-hidden' }],
			}),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		// `alt=""`: the empty string, not `alt="true"`
		expect(as.getAttribute('alt')).toBe('');
		// An attribute without a value is a boolean attribute that is present: its value is empty
		expect(as.getAttribute('title')).toBe('');
		expect(as.getAttribute('aria-hidden')).toBe('');
		expect(as.attributes.find(a => a.name === 'alt')?.literal).toBeNull();
	});

	test('{ dynamic: true } is a dynamic value', async () => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: asButton({ element: 'button', attrs: [{ name: 'tabindex', value: { dynamic: true } }] }),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'tabindex').isDynamicValue).toBe(true);
	});
});

describe('a pretender attribute of { fromAttr } is rendered under its own name', () => {
	const forward = (name: string, fromAttr: string): readonly Pretender[] => [
		{
			selector: 'Btn',
			as: { element: 'button', attrs: [{ name, value: { fromAttr, omitIfMissing: true } }] },
		},
	];

	test.each([
		// A prop that is forwarded to `disabled` is rendered as a boolean attribute
		['isDisabled={false}', 'disabled', absent],
		['isDisabled={true}', 'disabled', rendered('')],
		['isDisabled={0}', 'disabled', absent],
		['isDisabled={null}', 'disabled', absent],
		['isDisabled', 'disabled', rendered('')],
		// The same prop that is forwarded to `aria-label` is rendered as a string
		['isDisabled={false}', 'aria-label', rendered('false')],
		['isDisabled={true}', 'aria-label', rendered('true')],
		['isDisabled={null}', 'aria-label', absent],
		['isDisabled', 'aria-label', rendered('true')],
		['isDisabled={"x"}', 'aria-label', rendered('x')],
	])('<Btn %s> to %s', async (usage, name, expected) => {
		const document = createTestDocument(`<Btn ${usage} />`, {
			parser: await jsxParser(),
			specs,
			pretenders: forward(name, 'isDisabled'),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, name)).toStrictEqual(expected);
	});

	test.each([
		['1e999', 'Infinity'],
		['-1e999', '-Infinity'],
		['-0', '0'],
		['0x10', '16'],
	])('a number that is written as %s is %s under the name of the destination', async (written, rendered) => {
		const document = createTestDocument(`<Btn size={${written}} />`, {
			parser: await jsxParser(),
			specs,
			pretenders: forward('title', 'size'),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(as.getAttribute('title')).toBe(rendered);
		// The value is known: it is the literal that is rendered, not the text of code that is not read
		expect(as.attributes.find(a => a.name === 'title')?.isDynamicValue).toBeUndefined();
	});

	test('an expression that is not a literal is dynamic', async () => {
		const document = createTestDocument('<Btn isDisabled={flag} />', {
			parser: await jsxParser(),
			specs,
			pretenders: forward('disabled', 'isDisabled'),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'disabled').isDynamicValue).toBe(true);
		expect(stateOf(as, 'disabled').isAbsent).toBeUndefined();
	});

	test('a static string is copied', async () => {
		const document = createTestDocument('<Btn label="Hi" />', {
			parser: await jsxParser(),
			specs,
			pretenders: forward('aria-label', 'label'),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'aria-label')).toStrictEqual(rendered('Hi'));
	});

	test('a prop that is not written is omitted with omitIfMissing', async () => {
		const document = createTestDocument('<Btn />', {
			parser: await jsxParser(),
			specs,
			pretenders: forward('aria-label', 'label'),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(as.attributes.find(a => a.name === 'aria-label')).toBeUndefined();
	});

	test('a literal of Vue (`:is-disabled`) is rendered under the name of the destination', async () => {
		const vue = (await import('@markuplint/vue-spec')).default as ExtendedSpec;
		const document = createTestDocument('<template><Btn :is-disabled="false" /></template>', {
			parser: await vueParser(),
			specs: schemaToSpec([htmlSpec as unknown as MLMLSpec, vue]),
			pretenders: forward('disabled', 'isDisabled'),
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'disabled')).toStrictEqual(absent);
	});
});

describe('an attribute that a pretender takes over from the source is not made by it', () => {
	test('inheritAttrs keeps the position and is rendered by the element that it goes to', async () => {
		const document = createTestDocument('<Btn aria-busy={true} disabled={false} title="x" />', {
			parser: await jsxParser(),
			specs,
			pretenders: [{ selector: 'Btn', as: { element: 'button', inheritAttrs: true } }],
		});
		const as = pretenderOf(document.querySelector('Btn'));
		expect(stateOf(as, 'aria-busy')).toStrictEqual({
			value: 'true',
			isDynamicValue: undefined,
			isAbsent: undefined,
			isPretended: false,
		});
		expect(stateOf(as, 'disabled')).toStrictEqual({
			value: '',
			isDynamicValue: true,
			isAbsent: true,
			isPretended: false,
		});
		expect(stateOf(as, 'title').isPretended).toBe(false);
	});
});

describe('a fix of a report on an attribute that a pretender made', () => {
	async function fixesOf(scopeOf: (el: MLElement<any, any>) => any) {
		const document = createTestDocument('<Btn title="source" />', {
			parser: await jsxParser(),
			specs,
			pretenders: [
				{
					selector: 'Btn',
					as: { element: 'button', inheritAttrs: true, attrs: [{ name: 'type', value: 'button' }] },
				},
			],
		});
		const rule = createRule({
			name: 'test-rule',
			defaultValue: true,
			verify({ document, report }) {
				for (const el of document.getElementsByTagName('Btn')) {
					const scope = scopeOf(el);
					report({
						scope,
						message: 'm',
						fix: fixer => fixer.removeRange([scope.startOffset, scope.startOffset + 1]),
					});
				}
			},
		});
		return rule.verify(document, { locale: 'en' }, true);
	}

	test('is dropped, as the position of the attribute is the position of the element', async () => {
		const violations = await fixesOf(el => pretenderOf(el).attributes.find(a => a.name === 'type'));
		expect(violations).toHaveLength(1);
		expect(violations[0]?.fix).toBeUndefined();
	});

	test('is kept for an attribute that is in the source, which is what the position tells', async () => {
		const violations = await fixesOf(el => pretenderOf(el).attributes.find(a => a.name === 'title'));
		expect(violations).toHaveLength(1);
		expect(violations[0]?.fix).toBeDefined();
	});

	test('is kept for an element', async () => {
		const violations = await fixesOf(el => el);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.fix).toBeDefined();
	});
});
