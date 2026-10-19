import type { SelectorElement } from './types.js';

import { describe, expect, test } from 'vitest';

import { createSelector } from './create-selector.js';
import { typeNameMatches } from './type-name.js';

type Kind = NonNullable<SelectorElement['tagNameKind']>;

/**
 * What `MLElement` is in a document that resolves a component by any spelling of its name
 * (Vue): a component keeps its name as written (`localName === nodeName`), an HTML element
 * has a lower-case `localName` and an upper-case `nodeName`.
 */
function mockElement(localName: string, tagNameKind?: Kind): SelectorElement {
	return {
		nodeType: 1,
		nodeName: tagNameKind === 'component' ? localName : localName.toUpperCase(),
		localName,
		id: '',
		namespaceURI: 'http://www.w3.org/1999/xhtml',
		classList: { contains: () => false },
		attributes: [],
		parentNode: null,
		parentElement: null,
		previousElementSibling: null,
		nextElementSibling: null,
		children: [],
		...(tagNameKind === undefined ? {} : { tagNameKind }),
	} as unknown as SelectorElement;
}

describe('a component', () => {
	test.each([
		// The same component whichever way it is written
		['FooBar', 'FooBar', true],
		['FooBar', 'fooBar', true],
		['FooBar', 'foo-bar', true],
		['fooBar', 'FooBar', true],
		['foo-bar', 'FooBar', true],
		['foo-bar', 'fooBar', true],
		['IonButton', 'ion-button', true],
		// `<foobar>` is not a reference to `FooBar`
		['FooBar', 'foobar', false],
		['foo-bar', 'foobar', false],
		// One word: the selector is the name as written, or capitalized
		['Button', 'Button', true],
		['Transition', 'transition', true],
		['button', 'Button', false],
		// A member tag
		['UI.Item', 'UI.Item', true],
		['Ui.Item', 'ui.Item', true],
		['ui.Item', 'Ui.Item', false],
	])('selector %s and <%s>: %s', (selectorName, localName, expected) => {
		expect(typeNameMatches(selectorName, mockElement(localName, 'component'))).toBe(expected);
	});
});

describe('an HTML element that has a specification', () => {
	test('is matched by its name in lower case', () => {
		expect(typeNameMatches('button', mockElement('button', 'native'))).toBe(true);
	});

	test.each(['Button', 'BUTTON'])('is not matched by %s, the name of a component', selectorName => {
		expect(typeNameMatches(selectorName, mockElement('button', 'native'))).toBe(false);
	});
});

describe('an HTML element that has no specification', () => {
	test.each([
		['foobar', true],
		['Foobar', true],
		['FOOBAR', true],
		['FooBar', false],
		['foo-bar', false],
	])('selector %s and <foobar>: %s', (selectorName, expected) => {
		expect(typeNameMatches(selectorName, mockElement('foobar', 'unknown-html'))).toBe(expected);
	});
});

describe('a document that does not resolve a component by any spelling of its name', () => {
	test.each([
		['FooBar', 'foobar', true],
		['div', 'div', true],
		['DIV', 'div', true],
		['foo-bar', 'FooBar', false],
	])('selector %s and <%s> is compared as it was: %s', (selectorName, localName, expected) => {
		expect(typeNameMatches(selectorName, mockElement(localName))).toBe(expected);
	});

	test('a selector matches through `createSelector` as it did', () => {
		expect(createSelector('FooBar').match(mockElement('foobar'))).toBeTruthy();
		expect(createSelector('FooBar').match(mockElement('foobar', 'unknown-html'))).toBe(false);
		expect(createSelector('foo-bar').match(mockElement('FooBar', 'component'))).toBeTruthy();
		expect(createSelector('button').match(mockElement('Button', 'component'))).toBe(false);
	});
});
