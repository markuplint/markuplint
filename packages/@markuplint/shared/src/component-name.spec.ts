import { describe, expect, test } from 'vitest';

import {
	camelize,
	capitalize,
	isMultiWordName,
	pascalize,
	resolvesToVueComponent,
	vuePropKey,
	vueTagNameMatches,
} from './component-name.js';

describe('camelize / capitalize / pascalize', () => {
	test.each([
		['foo-bar', 'fooBar', 'FooBar'],
		['foo-bar-baz', 'fooBarBaz', 'FooBarBaz'],
		['FooBar', 'FooBar', 'FooBar'],
		['fooBar', 'fooBar', 'FooBar'],
		['foo', 'foo', 'Foo'],
		['ion-button', 'ionButton', 'IonButton'],
	])('%s', (name, camel, pascal) => {
		expect(camelize(name)).toBe(camel);
		expect(pascalize(name)).toBe(pascal);
	});

	test('capitalize', () => {
		expect(capitalize('foo')).toBe('Foo');
		expect(capitalize('')).toBe('');
	});
});

describe('vuePropKey', () => {
	test.each([
		['my-label', 'mylabel'],
		['myLabel', 'mylabel'],
		['mylabel', 'mylabel'],
		['data-id', 'dataid'],
		['dataId', 'dataid'],
		['aria-label', 'arialabel'],
	])('%s is %s', (name, key) => {
		expect(vuePropKey(name)).toBe(key);
	});
});

describe('isMultiWordName', () => {
	test.each([
		['foo-bar', true],
		['FooBar', true],
		['fooBar', true],
		['foo2Bar', true],
		['foo', false],
		['Foo', false],
		['FOO', false],
		['UI', false],
	])('%s', (name, expected) => {
		expect(isMultiWordName(name)).toBe(expected);
	});
});

describe('resolvesToVueComponent', () => {
	test.each([
		// As written, camelized, or capitalized after camelizing: `resolveSetupReference` of Vue
		['FooBar', 'FooBar', true],
		['fooBar', 'fooBar', true],
		['fooBar', 'FooBar', true],
		['foo-bar', 'FooBar', true],
		['foo-bar', 'fooBar', true],
		['foo-bar', 'foo-bar', true],
		['myButton', 'myButton', true],
		['my-button', 'myButton', true],
		['button', 'Button', true],
		// Nothing makes the tag a reference to these
		['FooBar', 'fooBar', false],
		['FooBar', 'foo-bar', false],
		['foobar', 'FooBar', false],
		['foo-bar', 'Foobar', false],
		['Button', 'button', false],
	])('<%s> to %s', (tag, registered, expected) => {
		expect(resolvesToVueComponent(tag, registered)).toBe(expected);
	});
});

describe('vueTagNameMatches', () => {
	test.each([
		// A name of more than one word: the same component whichever way it is written
		['FooBar', 'FooBar', true],
		['FooBar', 'fooBar', true],
		['FooBar', 'foo-bar', true],
		['fooBar', 'FooBar', true],
		['fooBar', 'foo-bar', true],
		['foo-bar', 'FooBar', true],
		['foo-bar', 'fooBar', true],
		['foo-bar', 'foo-bar', true],
		['IonButton', 'ion-button', true],
		['FooBar', 'foobar', false],
		['foo-bar', 'foobar', false],
		['FooBar', 'FooBaz', false],
		// One word: the selector is the name as written or the capitalized one (`resolveSetupReference`)
		['Button', 'Button', true],
		['button', 'button', true],
		['Transition', 'transition', true],
		['button', 'Button', false],
		['transition', 'Transition', false],
		['Foo', 'bar', false],
		// A member tag: the head is a name of a binding, the rest is as written
		['UI.Item', 'UI.Item', true],
		['Ui.Item', 'ui.Item', true],
		['ui.Item', 'Ui.Item', false],
		['UI.Item', 'UI.item', false],
		['FooBar.Item', 'foo-bar.Item', true],
		['Ui.Item', 'Ui', false],
		['Ui', 'Ui.Item', false],
	])('selector %s to <%s>', (selectorName, tagName, expected) => {
		expect(vueTagNameMatches(selectorName, tagName)).toBe(expected);
	});
});
