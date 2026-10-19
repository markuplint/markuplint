import type { AttrNameRoute } from '@markuplint/ml-ast';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser as htmlParser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

type Options = {
	readonly route?: AttrNameRoute;
	readonly componentNameVariants?: boolean;
};

/** An HTML source read by the HTML parser, in a document that says how its attribute names reach the DOM. */
function html(source: string, options?: Options) {
	return new MLDocument(
		htmlParser.parse(source),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		{ attrNameRoute: options?.route, componentNameVariants: options?.componentNameVariants },
	);
}

/** A JSX source: its `{...}` values are dynamic, its tags are case-sensitive, and an unknown tag is a component. */
async function jsx(source: string, options?: Options) {
	const jsxParser = await import('@markuplint/jsx-parser');
	return new MLDocument(
		jsxParser.parser.parse(source),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		{
			tagNameCaseSensitive: true,
			attrNameCaseSensitive: true,
			attrNameRoute: options?.route ?? 'dom-api',
			componentNameVariants: options?.componentNameVariants,
		},
	);
}

function attrOf(document: MLDocument<any, any>, selector: string, index = 0) {
	const el = document.querySelector(selector);
	const attr = el?.getAttributeTokens()[index];
	if (!el || !attr) {
		throw new TypeError(`No attribute ${index} on ${selector}`);
	}
	return attr;
}

describe('an attribute name that the HTML parser reads', () => {
	test('[ml-attr-name-route-001] is the name that the DOM gives it, whatever the case written', () => {
		const document = html('<div DATA-X="1"></div><svg VIEWBOX="0 0 1 1" ROLE="img"></svg>');
		const div = attrOf(document, 'div');
		expect(div.nameKey).toBe('data-x');
		expect(div.isNamedBy('data-x')).toBe(true);
		expect(div.isNamedBy('DATA-X')).toBe(true);
		// The parser restores the case that SVG gives its names
		const viewBox = attrOf(document, 'svg', 0);
		expect(viewBox.nameKey).toBe('viewBox');
		expect(viewBox.isNamedBy('viewBox')).toBe(true);
		expect(viewBox.isNamedBy('viewbox')).toBe(true);
		const role = attrOf(document, 'svg', 1);
		expect(role.nameKey).toBe('role');
		expect(role.isNamedBy('role')).toBe(true);
	});

	test('[ml-attr-name-route-002] is found by the lookups of the element in any case', () => {
		const document = html('<a HREF="x"></a><svg VIEWBOX="0 0 1 1"></svg>');
		const a = document.querySelector('a');
		expect(a?.getAttribute('href')).toBe('x');
		expect(a?.hasAttribute('HREF')).toBe(true);
		expect(a?.getAttributeToken('href')).toHaveLength(1);
		expect(a?.getAttributePretended('href')).toBe('x');
		expect(document.querySelector('svg')?.hasAttribute('viewBox')).toBe(true);
	});

	test('[ml-attr-name-route-003] folds only the ASCII letters', () => {
		// U+212A KELVIN SIGN is not an ASCII `K`
		const kelvin = String.fromCodePoint(8490);
		const attr = attrOf(html(`<div x-${kelvin}="1"></div>`), 'div');
		expect(attr.isNamedBy('x-k')).toBe(false);
		expect(attr.isNamedBy(`x-${kelvin}`)).toBe(true);
	});

	test('[ml-attr-name-route-004] of a custom element is folded as an HTML element', () => {
		const attr = attrOf(html('<x-a ID="1"></x-a>'), 'x-a');
		expect(attr.nameKey).toBe('id');
		expect(attr.isNamedBy('id')).toBe(true);
	});

	test('[ml-attr-name-route-005] the first of two spellings of one name is the one that the DOM keeps', () => {
		const el = html('<div id="a" ID="b"></div>').querySelector('div');
		expect(el?.getAttribute('id')).toBe('a');
		// Every attribute that was written is still there for a rule to check
		expect(el?.attributes).toHaveLength(2);
		expect(el?.getAttributeToken('id')).toHaveLength(2);
	});
});

describe('an attribute name that code sets through the DOM API', () => {
	test('[ml-attr-name-route-006] on an HTML element is folded, as setAttribute does', async () => {
		const document = await jsx('<div><div ROLE="button" /></div>');
		const attr = attrOf(document, 'div > div');
		expect(attr.nameKey).toBe('role');
		expect(attr.isNamedBy('role')).toBe(true);
		expect(document.querySelector('div > div')?.getAttribute('role')).toBe('button');
	});

	test('[ml-attr-name-route-007] on an SVG element stays as written', async () => {
		const document = await jsx('<svg ROLE="img" viewBox="0 0 1 1" viewbox="0 0 2 2" />');
		const role = attrOf(document, 'svg', 0);
		expect(role.nameKey).toBe('ROLE');
		expect(role.isNamedBy('role')).toBe(false);
		expect(role.isNamedBy('ROLE')).toBe(true);
		const svg = document.querySelector('svg');
		expect(svg?.getAttribute('role')).toBeNull();
		expect(svg?.hasAttribute('ROLE')).toBe(true);
		expect(attrOf(document, 'svg', 1).isNamedBy('viewbox')).toBe(false);
		expect(attrOf(document, 'svg', 2).isNamedBy('viewBox')).toBe(false);
	});

	test('[ml-attr-name-route-008] the computed role of an SVG element does not read ROLE as role', async () => {
		const roleOf = async (source: string) => {
			const document = await jsx(source);
			const el = document.querySelector('svg, div');
			return el ? getComputedRole(document.specs, el, ARIA_RECOMMENDED_VERSION, true).role?.name : undefined;
		};

		expect(await roleOf('<div ROLE="button" />')).toBe('button');
		expect(await roleOf('<svg ROLE="button" />')).not.toBe('button');
		expect(await roleOf('<svg role="button" />')).toBe('button');
	});

	test('[ml-attr-name-route-009] the last of two spellings of one name is the one that the DOM keeps', async () => {
		const el = (await jsx('<div id="a" ID="b" />')).querySelector('div');
		expect(el?.getAttribute('id')).toBe('b');
		expect(el?.attributes).toHaveLength(2);
	});

	test('[ml-attr-name-route-010] a name of the framework with a capital letter is not folded into one of the DOM', async () => {
		// `defaultValue` is a prop of React, not an attribute, so `defaultvalue` is not it
		const attrs = (await jsx('<input defaultValue="a" defaultvalue="b" />'))
			.querySelector('input')
			?.getAttributeTokens();
		expect(attrs?.[0]?.isNamedBy('defaultValue')).toBe(true);
		expect(attrs?.[1]?.isNamedBy('defaultValue')).toBe(false);
		// A name of the DOM is found by its lower-case spelling, which React spells in camel case
		const document = await jsx('<input tabIndex="0" />');
		expect(attrOf(document, 'input').isNamedBy('tabindex')).toBe(true);
	});
});

describe('an attribute name that is in an HTML string unless it is dynamic', () => {
	test('[ml-attr-name-route-011] a static one is read by the HTML parser and a dynamic one is set by code', async () => {
		const document = await jsx('<svg VIEWBOX="0 0 1 1" ROLE={r} />', { route: 'dom-api-when-dynamic' });
		// Static: the parser restores `viewBox`
		expect(attrOf(document, 'svg', 0).nameKey).toBe('viewBox');
		expect(attrOf(document, 'svg', 0).isNamedBy('viewbox')).toBe(true);
		// Dynamic: set as written
		expect(attrOf(document, 'svg', 1).nameKey).toBe('ROLE');
		expect(attrOf(document, 'svg', 1).isNamedBy('role')).toBe(false);
	});
});

describe('an attribute name of a component', () => {
	test('[ml-attr-name-route-012] is a prop, which is not folded', async () => {
		const attr = attrOf(await jsx('<Comp fooBar="1" />'), 'Comp');
		expect(attr.isNamedBy('fooBar')).toBe(true);
		expect(attr.isNamedBy('foobar')).toBe(false);
		expect(attr.isNamedBy('FOOBAR')).toBe(false);
	});

	test('[ml-attr-name-route-013] of a Vue component is the camel case of its name', async () => {
		const document = await jsx('<Comp my-label="1" />', { componentNameVariants: true });
		const attr = attrOf(document, 'Comp');
		expect(attr.isNamedBy('myLabel')).toBe(true);
		expect(attr.isNamedBy('mylabel')).toBe(false);
		// and the lookups of the element read it so
		expect(document.querySelector('Comp')?.getAttribute('myLabel')).toBe('1');
	});

	test('[ml-attr-name-route-014] is exact for the fromAttr of a pretender', async () => {
		const pretender = (source: string) =>
			jsx(source).then(document => {
				const el = document.querySelector('Comp');
				return el?.getAttributePretended('label');
			});
		expect(await pretender('<Comp label="a" />')).toBe('a');
		expect(await pretender('<Comp Label="a" />')).toBeNull();
	});
});

describe('the prefix of a name', () => {
	test('[ml-attr-name-route-017] is read as the DOM reads the name, or as written', async () => {
		const attr = attrOf(html('<div DATA-X="1"></div>'), 'div');
		expect(attr.isPrefixedBy('data-')).toBe(true);
		expect(attr.isPrefixedBy('DATA-')).toBe(true);
		expect(attr.isPrefixedBy('aria-')).toBe(false);
		// The attribute of a prop is its name as written
		const prop = attrOf(await jsx('<Comp fooBar="1" />'), 'Comp');
		expect(prop.isPrefixedBy('foo')).toBe(true);
		expect(prop.isPrefixedBy('FOO')).toBe(false);
		// On an SVG element that code sets, a name is as written
		const svg = attrOf(await jsx('<svg DATA-X="1" />'), 'svg');
		expect(svg.isPrefixedBy('DATA-')).toBe(true);
		expect(svg.isPrefixedBy('data-')).toBe(false);
		// A prefix with a capital letter, on an HTML element that code sets, is the prefix of a name of the framework
		const html5 = attrOf(await jsx('<div dataX="1" />'), 'div');
		expect(html5.isPrefixedBy('data')).toBe(true);
		expect(html5.isPrefixedBy('DATA')).toBe(false);
	});
});

describe('the suggestion of the framework for a name', () => {
	test('[ml-attr-name-route-018] is made for a spelling of another case as well', async () => {
		const jsxParser = await import('@markuplint/jsx-parser');
		const document = new MLDocument(
			jsxParser.parser.parse('<div tabindex="0" TABINDEX="1" tabIndex="2" />'),
			convertRuleset(),
			[{ ...(spec as unknown as MLMLSpec), acceptedAttrNames: 'idl' }, {}],
			{ ariaVersion: ARIA_RECOMMENDED_VERSION },
			{ tagNameCaseSensitive: true, attrNameCaseSensitive: true, attrNameRoute: 'dom-api' },
		);
		const el = document.querySelector('div');
		expect(el?.getAttributeToken('tabindex').map(attr => attr.candidate)).toStrictEqual([
			'tabIndex',
			'tabIndex',
			undefined,
		]);
	});
});

describe('an attribute selector', () => {
	test('[ml-attr-name-route-015] matches the name that the DOM gives the attribute', () => {
		const document = html('<svg VIEWBOX="0 0 1 1"></svg><div ROLE="x"></div><x-a DATA-A="1"></x-a>');
		expect(document.querySelector('svg')?.matches('[viewBox]')).toBe(true);
		// An SVG element matches a selector by the case of its names
		expect(document.querySelector('svg')?.matches('[viewbox]')).toBe(false);
		expect(document.querySelector('div')?.matches('[role]')).toBe(true);
		expect(document.querySelector('div')?.matches('[ROLE]')).toBe(true);
		expect(document.querySelector('x-a')?.matches('[data-a]')).toBe(true);
	});

	test('[ml-attr-name-route-016] does not match what the DOM keeps apart on an SVG element', async () => {
		const document = await jsx('<svg VIEWBOX="0 0 1 1" ROLE="img" />');
		const svg = document.querySelector('svg');
		expect(svg?.matches('[VIEWBOX]')).toBe(true);
		expect(svg?.matches('[viewBox]')).toBe(false);
		expect(svg?.matches('[role]')).toBe(false);
		expect(svg?.matches('[ROLE]')).toBe(true);
	});
});
