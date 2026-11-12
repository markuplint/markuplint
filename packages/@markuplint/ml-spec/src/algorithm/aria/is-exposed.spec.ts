import type { ARIAVersion } from '../../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { isExposed } from './is-exposed.js';

function _(html: string, selector?: string) {
	return createJSDOMElement(html, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

function x(html: string, selector?: string, version: ARIAVersion = '1.2') {
	const el = _(html, selector);
	return isExposed(el, specs, version);
}

describe('isExposed', () => {
	test('Basic', () => {
		expect(x('<div></div>')).toBe(true);
		expect(x('<div aria-hidden="true"></div>')).toBe(false);
		expect(x('<div role="presentation"></div>')).toBe(false);
		expect(x('<div role="presentation" aria-hidden="true"></div>')).toBe(false);
		expect(x('<div role="presentation"><span></span></div>', 'span')).toBe(true);
		expect(x('<div role="presentation" aria-hidden="true"><span></span></div>', 'span')).toBe(false);
		expect(x('<div style="display: none;"><span></span></div>', 'span')).toBe(false);
		expect(x('<div hidden><span></span></div>', 'span')).toBe(false);
		expect(x('<div hidden="until-found"><span></span></div>', 'span')).toBe(false);
		expect(x('<html><body>content</body></html>', 'body')).toBe(true);
		expect(x('<ul><li></li></ul>', 'li')).toBe(true);
	});

	test('Children Presentational: True', () => {
		expect(x('<button></button>')).toBe(true);
		expect(x('<button hidden></button>')).toBe(false);
		expect(x('<button><span></span></button>', 'span')).toBe(false);
		expect(x('<button hidden><span></span></button>', 'span')).toBe(false);
	});

	test('Hidden elements', () => {
		expect(x('<input type="text">')).toBe(true);
		expect(x('<input type="hidden">')).toBe(false);
		expect(x('<meta>')).toBe(false);
		expect(x('<style>a{}</style>')).toBe(false);
		expect(x('<script>"";</script>')).toBe(false);
	});

	test('Recent element', () => {
		expect(x('<canvas></canvas>')).toBe(true);
		expect(x('<dialog></dialog>')).toBe(true);
		expect(x('<details></details>')).toBe(true);
		expect(x('<summary></summary>')).toBe(true);
		expect(x('<meter></meter>')).toBe(true);
		expect(x('<progress></progress>')).toBe(true);
		expect(x('<picture></picture>')).toBe(true);
		expect(x('<ruby></ruby>')).toBe(true);
		expect(x('<pt></pt>')).toBe(true);
		expect(x('<rp></rp>')).toBe(true);
		expect(x('<time></time>')).toBe(true);
		expect(x('<slot></slot>')).toBe(true);
		expect(x('<portal></portal>')).toBe(true);
	});

	test('Unknown element', () => {
		expect(x('<unknown></unknown>')).toBe(true);
		expect(x('<font></font>')).toBe(true);
		expect(x('<x-component></x-component>')).toBe(true);
	});

	describe('an attribute that the host does not output', () => {
		// The attribute is in the list of the element but is not an attribute of the DOM (`MLAttr#isAbsent`),
		// so it is not read for a global ARIA attribute. `isExposed` is `true` by default and the global ARIA
		// attribute only confirms it, so the result does not tell whether an attribute was counted: what is
		// observable is which attributes are read, whatever the order.
		function withAttributes(html: string, attributes: readonly object[]) {
			const el = _(html);
			Object.defineProperty(el, 'attributes', { value: attributes });
			return el;
		}

		test('is not read', () => {
			const read: string[] = [];
			const attr = (name: string, isAbsent?: true) => ({
				get localName() {
					read.push(name);
					return name;
				},
				isAbsent,
			});
			const el = withAttributes('<span></span>', [attr('aria-label', true), attr('aria-busy')]);
			expect(isExposed(el, specs, '1.2')).toBe(true);
			expect([...new Set(read)]).toStrictEqual(['aria-busy']);
		});
	});
});

describe('an element of the light DOM of a shadow host', () => {
	test('is not exposed when no slot takes it, as it is not rendered', () => {
		const el = Object.assign(_('<button></button>'), { getFlatTreeSlot: () => null });
		expect(isExposed(el, specs, '1.2')).toBe(false);
	});

	test('is not exposed when an ancestor is not rendered', () => {
		const parent = Object.assign(_('<div><button></button></div>'), { getFlatTreeSlot: () => null });
		const el = parent.querySelector('button')!;
		expect(isExposed(el, specs, '1.2')).toBe(false);
	});

	test('is exposed when a slot takes it, or when the assignment is not known', () => {
		const slot = _('<slot></slot>');
		expect(isExposed(Object.assign(_('<button></button>'), { getFlatTreeSlot: () => slot }), specs, '1.2')).toBe(
			true,
		);
		expect(isExposed(Object.assign(_('<button></button>'), { getFlatTreeSlot: () => {} }), specs, '1.2')).toBe(
			true,
		);
	});
});
