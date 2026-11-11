import specs from '@markuplint/html-spec';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { createSelector } from './create-selector.js';
import { InvalidSelectorError } from './invalid-selector-error.js';

function c(selector: string, html: string) {
	return createSelector(selector, specs).match(createJSDOMElement(html));
}

describe('Extended Selector', () => {
	test(':aria', () => {
		expect(c(':aria(has name)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':aria(has name|1.2)', '<button>foo</button>')).toBeTruthy();
	});

	test(':role', () => {
		expect(c(':role(button)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.1)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<button>foo</button>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<div role="button">foo</div>')).toBeTruthy();
		expect(c(':role(button|1.2)', '<div>foo</div>')).toBeFalsy();
	});

	test(':model', () => {
		expect(c(':model(flow)', '<a></a>')).toBeTruthy();
		expect(c(':model(interactive)', '<a></a>')).toBeFalsy();
		expect(c(':model(interactive)', '<a href="path/to"></a>')).toBeTruthy();
		expect(c(':not(:model(interactive))', '<a href="path/to"></a>')).toBeFalsy();
	});

	test('extended pseudo-class names are ASCII case-insensitive', () => {
		expect(c(':MODEL(interactive)', '<a href="path/to"></a>')).toBeTruthy();
		expect(c(':NOT(:MODEL(interactive))', '<a href="path/to"></a>')).toBeFalsy();
		expect(c(':MODEL(flow)', '<a></a>')).toBeTruthy();
	});

	test.each([
		['<div>\n<!-- c --><style></style></div>', 'style', true],
		['<div><p></p><style></style></div>', 'style', false],
		['<div>text<style></style></div>', 'style', false],
		['<div>\u00A0<style></style></div>', 'style', false],
		['<div>text<p></p></div>', 'p', true],
	])(
		':model(flow) matches a style element only as the first child of its parent, as the HTML Standard counts it: %j',
		(html, target, expected) => {
			const el = createJSDOMElement(html, target);
			expect(createSelector(':model(flow)', specs).match(el) !== false).toBe(expected);
			expect(createSelector(':not(:model(flow))', specs).match(el) !== false).toBe(!expected);
		},
	);

	test('style:first-child written as a selector keeps the Selectors definition, which does not count text', () => {
		const el = createJSDOMElement('<div>text<style></style></div>', 'style');
		expect(createSelector('style:first-child', specs).match(el)).toBeTruthy();
		const afterElement = createJSDOMElement('<div><p></p><style></style></div>', 'style');
		expect(createSelector('style:first-child', specs).match(afterElement)).toBe(false);
	});

	test(':model matches #custom only for an element that reports isCustomElement', () => {
		const plain = createJSDOMElement('<x-foo></x-foo>');
		const custom = Object.defineProperty(createJSDOMElement('<x-foo></x-foo>'), 'isCustomElement', {
			value: true,
		});
		expect(createSelector(':model(flow)', specs).match(plain)).toBeFalsy();
		expect(createSelector(':model(flow)', specs).match(custom)).toBeTruthy();
		expect(createSelector(':model(interactive)', specs).match(custom)).toBeFalsy();
	});

	test('The address element', () => {
		const contentModel =
			':model(flow):not(address, :model(heading), :model(sectioning), header, footer, :has(address, :model(heading), :model(sectioning), header, footer))';
		expect(c(contentModel, '<a></a>')).toBeTruthy();
		expect(c(contentModel, '<h1></h1>')).toBeFalsy();
		expect(c(contentModel, '<address></address>')).toBeFalsy();
		expect(c(contentModel, '<header></header>')).toBeFalsy();
		expect(c(contentModel, '<div><a></a></div>')).toBeTruthy();
		expect(c(contentModel, '<div><h1></h1></div>')).toBeFalsy();
		expect(c(contentModel, '<div><address></address></div>')).toBeFalsy();
		expect(c(contentModel, '<div><header></header></div>')).toBeFalsy();
	});
});

describe(':display-size', () => {
	function select(html: string, selector: string) {
		return createSelector(selector, specs).match(createJSDOMElement(html, 'select')) !== false;
	}

	test.each([
		['<select></select>', ':display-size(= 1)', true],
		['<select></select>', ':display-size(> 1)', false],
		['<select multiple></select>', ':display-size(= 4)', true],
		['<select multiple></select>', ':display-size(> 1)', true],
		['<select size="2"></select>', ':display-size(> 1)', true],
		['<select size="2"></select>', ':display-size(>= 2)', true],
		['<select size="2"></select>', ':display-size(< 2)', false],
		['<select size="2"></select>', ':display-size(<= 2)', true],
		['<select size="1"></select>', ':display-size(> 1)', false],
		['<select size="0"></select>', ':display-size(= 0)', true],
		['<select size="0"></select>', ':display-size(> 1)', false],
		['<select size="01"></select>', ':display-size(= 1)', true],
		['<select size="01"></select>', ':display-size(> 1)', false],
		['<select size="02"></select>', ':display-size(> 1)', true],
		['<select size=" 3"></select>', ':display-size(= 3)', true],
		['<select size="+3"></select>', ':display-size(= 3)', true],
		['<select size="3abc"></select>', ':display-size(= 3)', true],
		['<select size="-1"></select>', ':display-size(= 1)', true],
		['<select size="abc"></select>', ':display-size(> 1)', false],
		['<select size="abc"></select>', ':display-size(= 1)', true],
		['<select size="abc" multiple></select>', ':display-size(= 4)', true],
		['<select size=""></select>', ':display-size(= 1)', true],
	])('%s matches %s: %j', (html, selector, expected) => {
		expect(select(html, selector)).toBe(expected);
	});

	test('no spaces are needed around the operator', () => {
		expect(select('<select size="2"></select>', ':display-size(>1)')).toBe(true);
		expect(select('<select size="2"></select>', ':display-size(>=3)')).toBe(false);
	});

	test('combined with other selectors', () => {
		const selector = 'select:is([multiple], :display-size(> 1))';
		expect(select('<select></select>', selector)).toBe(false);
		expect(select('<select multiple></select>', selector)).toBe(true);
		expect(select('<select size="2"></select>', selector)).toBe(true);
		expect(select('<select size="1"></select>', selector)).toBe(false);
		expect(select('<select size="0"></select>', selector)).toBe(false);
	});

	test('works without the specs', () => {
		// The cache is keyed by the selector string: no other test uses `> 7`, so this is built without the specs
		const el = createJSDOMElement('<select size="8"></select>', 'select');
		expect(createSelector(':display-size(> 7)').match(el)).toBeTruthy();
		expect(createSelector(':display-size(> 8)').match(el)).toBe(false);
	});

	test('a number may have leading zeros', () => {
		expect(select('<select></select>', ':display-size(= 01)')).toBe(true);
		expect(select('<select size="2"></select>', ':display-size(> 001)')).toBe(true);
	});

	test('an element other than a select never matches', () => {
		const div = createJSDOMElement('<div size="2"></div>', 'div');
		expect(createSelector(':display-size(> 1)', specs).match(div)).toBe(false);
		expect(createSelector(':display-size(= 1)', specs).match(div)).toBe(false);
		const input = createJSDOMElement('<input size="2">', 'input');
		expect(createSelector(':display-size(> 1)', specs).match(input)).toBe(false);
	});

	test('a select in another namespace never matches', () => {
		const el = createJSDOMElement('<svg><select size="2"></select></svg>', 'select');
		expect(createSelector(':display-size(> 1)', specs).match(el)).toBe(false);
	});

	test.each([
		[':display-size()'],
		[':display-size(1)'],
		[':display-size(> )'],
		[':display-size(> a)'],
		[':display-size(=> 1)'],
		[':display-size(> -1)'],
		[':display-size(> 1.5)'],
	])('%s is an invalid selector', selector => {
		expect(() => createSelector(selector, specs).match(createJSDOMElement('<select></select>', 'select'))).toThrow(
			InvalidSelectorError,
		);
	});

	test.each([
		[':display-size()'],
		[':display-size(> a)'],
		[':display-size(> -1)'],
		['select:not(:display-size(> a))'],
	])('%s is an invalid selector when it is created', selector => {
		expect(() => createSelector(selector)).toThrow(InvalidSelectorError);
		expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
	});
});

describe('the argument of :aria() and :role()', () => {
	test.each([[':aria(foo)'], [':aria(has name|9.9)'], [':role(button|9.9)'], [':not(:aria(foo))']])(
		'%s is an invalid selector when it is created',
		selector => {
			expect(() => createSelector(selector)).toThrow(InvalidSelectorError);
			expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
		},
	);

	test.each([
		[':aria(has name)'],
		[':aria(has no name|1.2)'],
		[':role(button)'],
		[':role(button|1.2)'],
		[':model(flow)'],
	])('%s is created without specs', selector => {
		expect(() => createSelector(selector)).not.toThrow();
	});
});

describe(':model()', () => {
	test.each([[':model(foo)'], [':model(#flow)'], [':not(:model(foo))']])(
		'%s is an invalid selector when it is created with specs',
		selector => {
			expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
		},
	);

	test.each([[':model()'], [':model( )']])('%s is an invalid selector when it is created', selector => {
		expect(() => createSelector(selector)).toThrow(InvalidSelectorError);
		expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
	});

	test.each([[':model(flow)'], [':model(Flow)'], [':model( phrasing )'], [':model(SVGShape)'], [':model(svgshape)']])(
		'%s is created with specs',
		selector => {
			expect(() => createSelector(selector, specs)).not.toThrow();
		},
	);
});

describe('what the engine does not support is found for any spelling and position', () => {
	test.each([
		['div:NTH-CHILD(2)'],
		['div::before'],
		[':is(div, span:hover)'],
		[':closest(div:hover)'],
		[':where(div || span)'],
		[':ARIA(foo)'],
	])('%s is an invalid selector when it is created', selector => {
		expect(() => createSelector(selector)).toThrow(InvalidSelectorError);
		expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
	});
});

describe('what the engine supports is accepted when it is created and when it is matched', () => {
	const el = createJSDOMElement('<div><span></span></div>', 'span');

	test.each([
		['span:first-child'],
		['span:scope'],
		['span:not(div)'],
		['span:is(span, div)'],
		['span:where(span)'],
		['span:has(> a)'],
		['span:closest(div)'],
		[':root'],
		['span:display-size(= 1)'],
	])('%s', selector => {
		expect(() => createSelector(selector, specs)).not.toThrow();
		expect(() => createSelector(selector, specs).match(el)).not.toThrow();
	});
});

describe('the message of the parser', () => {
	test.each([
		['div[', 'Invalid selector: "div[" (Expected a closing square bracket.)'],
		['div:', 'Invalid selector: "div:" (Expected a pseudo-class or pseudo-element.)'],
	])('%s says what is wrong', (selector, message) => {
		expect(() => createSelector(selector)).toThrow(message);
	});

	test('the text of an internal error of the parser (`:is(` reads a missing node) is not shown as a diagnostic', () => {
		expect(() => createSelector(':is(')).toThrow(/^Invalid selector: ":is\("$/);
	});
});

describe('syntax the engine does not support', () => {
	test.each([
		['div || span'],
		['div:hover'],
		['div:lang(en)'],
		['div:nth-child(2)'],
		['div:nth-last-child(2)'],
		[':not(div:hover)'],
		[':is(div || span)'],
		[':has(> div:hover)'],
	])('%s is an invalid selector when it is created', selector => {
		expect(() => createSelector(selector)).toThrow(InvalidSelectorError);
		expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
	});

	test.each([
		['div || span', 'Unsupported column combinator yet.'],
		['div:hover', 'Unsupported pseudo :hover selector.'],
		['div:lang(en)', 'Unsupported pseudo :lang(en) selector.'],
		['div:nth-child(2)', 'Unsupported pseudo :nth-child(2) selector yet.'],
	])('the message of %s is the one of the engine', (selector, message) => {
		expect(() => createSelector(selector)).toThrow(message);
	});

	test('a nesting selector is an invalid selector', () => {
		expect(() => createSelector('& div')).toThrow(InvalidSelectorError);
		expect(() => createSelector('& div', specs)).toThrow(InvalidSelectorError);
	});

	test.each(['div/* c */', '/* c */div'])('a comment in %s is an invalid selector', selector => {
		expect(() => createSelector(selector)).toThrow(InvalidSelectorError);
		expect(() => createSelector(selector, specs)).toThrow(InvalidSelectorError);
	});

	test('an unknown namespace is an invalid selector when it is matched, and the error holds the selector and its own message', () => {
		const el = createJSDOMElement('<div></div>');
		expect.assertions(3);
		try {
			createSelector('foo|div', specs).match(el);
		} catch (error: unknown) {
			expect(error).toBeInstanceOf(InvalidSelectorError);
			expect((error as InvalidSelectorError).message).toBe('The foo namespace is not supported');
			expect((error as InvalidSelectorError).selector).toBe('foo|div');
		}
	});

	test('a nesting selector inside a pseudo-class is an invalid selector when it is created', () => {
		const el = createJSDOMElement('<div></div>');
		expect(() => createSelector(':is(&)', specs).match(el)).toThrow(InvalidSelectorError);
	});
});

// The cache outlives a test, so each test uses a selector no other test builds. Otherwise it would get an
// instance made by an earlier test and the identity checks below would pass without exercising the cache key.
describe('cache', () => {
	test('an instance created without specs is not returned to a later call with specs', () => {
		const el = createJSDOMElement('<a href="path/to"></a>');
		const withoutSpecs = createSelector(':model(interactive):not(.cache-order)');
		const withSpecs = createSelector(':model(interactive):not(.cache-order)', specs);
		expect(withSpecs).not.toBe(withoutSpecs);
		expect(withSpecs.match(el)).toBeTruthy();
	});

	test('an instance created with specs is not returned to a later call without specs', () => {
		const el = createJSDOMElement('<a href="path/to"></a>');
		const withSpecs = createSelector(':model(interactive):not(.cache-reverse-order)', specs);
		const withoutSpecs = createSelector(':model(interactive):not(.cache-reverse-order)');
		expect(withoutSpecs).not.toBe(withSpecs);
		expect(() => withoutSpecs.match(el)).toThrow('Unsupported pseudo');
	});

	test('calls with the same selector and the same specs share one instance', () => {
		expect(createSelector('a.cache-same', specs)).toBe(createSelector('a.cache-same', specs));
		expect(createSelector('a.cache-same')).toBe(createSelector('a.cache-same'));
	});

	test('calls with different specs objects do not share an instance', () => {
		const otherSpecs = { ...specs };
		expect(createSelector('a.cache-other-specs', otherSpecs)).not.toBe(
			createSelector('a.cache-other-specs', specs),
		);
	});
});
