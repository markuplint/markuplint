import { describe, expect, test } from 'vitest';

import { Selector } from '../selector.js';

import { displaySizePseudoClass } from './display-size-pseudo-class.js';

type Attribute = {
	readonly localName: string;
	readonly value?: string;
	readonly absent?: boolean;
	readonly nameCaseInsensitive?: boolean;
	readonly domName?: string;
};

function select(
	attributes: readonly Attribute[],
	over: { readonly tagNameKind?: string; readonly namespaceURI?: string | null } = {},
) {
	return {
		nodeType: 1,
		nodeName: 'SELECT',
		localName: 'select',
		id: '',
		namespaceURI: 'http://www.w3.org/1999/xhtml',
		classList: { contains: () => false },
		parent: null,
		parentElement: null,
		prevElementSibling: null,
		nextElementSibling: null,
		childElements: [],
		...over,
		attributes: attributes.map(attr => ({ value: '', namespaceURI: null, ...attr })),
	} as never;
}

/**
 * A selector that no other spec uses, built directly: the cache of `createSelector` would hand back an
 * instance that another spec made with the specs.
 */
function matches(selector: string, el: ReturnType<typeof select>) {
	return new Selector(selector, { 'display-size': displaySizePseudoClass() }).match(el) !== false;
}

describe(':display-size on an element that the host describes', () => {
	test('works with nothing but its own handler registered', () => {
		expect(matches('select:is([multiple], :display-size(> 3))', select([{ localName: 'size', value: '4' }]))).toBe(
			true,
		);
		expect(matches('select:is([multiple], :display-size(> 3))', select([{ localName: 'size', value: '3' }]))).toBe(
			false,
		);
	});

	test('an attribute name of an HTML element is compared as ASCII case-insensitive', () => {
		expect(matches(':display-size(= 2)', select([{ localName: 'SIZE', value: '2' }]))).toBe(true);
		expect(matches(':display-size(= 4)', select([{ localName: 'MULTIPLE' }]))).toBe(true);
	});

	test('an attribute that says its name is not case-insensitive is compared as it is', () => {
		expect(
			matches(':display-size(= 1)', select([{ localName: 'SIZE', value: '2', nameCaseInsensitive: false }])),
		).toBe(true);
		expect(
			matches(':display-size(= 2)', select([{ localName: 'size', value: '2', nameCaseInsensitive: false }])),
		).toBe(true);
	});

	test('the name the DOM gives an attribute is the one that is compared', () => {
		expect(matches(':display-size(= 2)', select([{ localName: 'my-size', domName: 'size', value: '2' }]))).toBe(
			true,
		);
	});

	test('an attribute that the framework does not output is not read', () => {
		expect(matches(':display-size(= 1)', select([{ localName: 'size', value: '2', absent: true }]))).toBe(true);
		expect(matches(':display-size(= 1)', select([{ localName: 'multiple', absent: true }]))).toBe(true);
	});

	test('the first size attribute is the one that is read', () => {
		const attributes = [
			{ localName: 'size', value: '2' },
			{ localName: 'size', value: '1' },
		];
		expect(matches(':display-size(= 2)', select(attributes))).toBe(true);
	});

	test('a component is not a select, whatever its name is', () => {
		const component = select([{ localName: 'size', value: '2' }], { tagNameKind: 'component' });
		expect(matches(':display-size(> 1)', component)).toBe(false);
	});

	test('a select that the document takes for native is a select', () => {
		const native = select([{ localName: 'size', value: '2' }], { tagNameKind: 'native' });
		expect(matches(':display-size(> 1)', native)).toBe(true);
	});

	test('a select of another namespace is not a select', () => {
		const svg = select([{ localName: 'size', value: '2' }], { namespaceURI: 'http://www.w3.org/2000/svg' });
		expect(matches(':display-size(> 1)', svg)).toBe(false);
	});
});
