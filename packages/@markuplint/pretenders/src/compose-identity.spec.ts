import { describe, test, expect } from 'vitest';

import { composeIdentity } from './compose-identity.js';
import { dependencyMapper } from './dependency-mapper.js';

describe('composeIdentity', () => {
	describe('the outer component says nothing about its children', () => {
		test('a bare element name gives the inner one as it is', () => {
			expect(composeIdentity('Pic', { element: 'picture', slots: true })).toStrictEqual({
				element: 'picture',
				slots: true,
			});
		});
	});

	describe('the inner component does not render its children', () => {
		test('the inner one is the result, whatever the outer component hands over', () => {
			expect(
				composeIdentity(
					{ element: 'Icon', slots: null, contents: [{ element: 'span' }] },
					{ element: 'svg', slots: null },
				),
			).toStrictEqual({ element: 'svg', slots: null });
		});
	});

	describe('the outer component never renders its children (slots: null)', () => {
		test('what it hands over takes the place of the slot of the inner one', () => {
			const outer = {
				element: 'Pic',
				slots: null,
				contents: [{ element: 'img', attrs: [{ name: 'alt', value: 'Example' }] }],
			} as const;

			expect(composeIdentity(outer, { element: 'picture', slots: true })).toStrictEqual({
				element: 'picture',
				slots: null,
				contents: [{ element: 'img', attrs: [{ name: 'alt', value: 'Example' }] }],
			});
		});

		test('it is placed where the inner one puts its slot among static contents', () => {
			expect(
				composeIdentity(
					{ element: 'Pic', slots: null, contents: [{ element: 'img' }] },
					{ element: 'picture', slots: true, contents: [{ element: 'source' }, { slot: true }] },
				),
			).toStrictEqual({
				element: 'picture',
				slots: null,
				contents: [{ element: 'source' }, { element: 'img' }],
			});
		});

		test('an inner wrapper takes it, and what surrounds the wrapper is unknown', () => {
			expect(
				composeIdentity(
					{ element: 'List', slots: null, contents: [{ element: 'li' }] },
					{ element: 'div', slots: [{ element: 'ul' }] },
				),
			).toStrictEqual({ element: 'div', slots: null, contents: [{ dynamic: true }] });
		});
	});

	describe('the outer component renders its children among what it hands over (slots: true)', () => {
		test('its slot position is the slot position of the inner one', () => {
			expect(
				composeIdentity(
					{ element: 'Pic', slots: true, contents: [{ slot: true }, { element: 'img' }] },
					{ element: 'picture', slots: true },
				),
			).toStrictEqual({
				element: 'picture',
				slots: true,
				contents: [{ slot: true }, { element: 'img' }],
			});
		});

		test('passing the children through leaves the inner one unchanged', () => {
			expect(
				composeIdentity({ element: 'Base', slots: true }, { element: 'details', slots: true }),
			).toStrictEqual({
				element: 'details',
				slots: true,
			});
			expect(
				composeIdentity(
					{ element: 'Base', slots: true },
					{ element: 'details', slots: true, contents: [{ dynamic: true }, { slot: true }] },
				),
			).toStrictEqual({
				element: 'details',
				slots: true,
				contents: [{ dynamic: true }, { slot: true }],
			});
		});

		test('what it hands over goes into the wrapper of the inner one', () => {
			expect(
				composeIdentity(
					{ element: 'Tabs', slots: true, contents: [{ element: 'li' }, { slot: true }] },
					{ element: 'div', slots: [{ element: 'ul', attrs: [{ name: 'role', value: 'tablist' }] }] },
				),
			).toStrictEqual({
				element: 'div',
				slots: [
					{
						element: 'ul',
						attrs: [{ name: 'role', value: 'tablist' }],
						contents: [{ element: 'li' }, { slot: true }],
					},
				],
			});
		});
	});

	describe('the outer component renders its children in a wrapper (slots: [...])', () => {
		test('the wrapper of the outer one is the result', () => {
			expect(
				composeIdentity(
					{ element: 'Card', slots: [{ element: 'p' }] },
					{ element: 'div', slots: true, contents: [{ element: 'h2' }, { slot: true }] },
				),
			).toStrictEqual({ element: 'div', slots: [{ element: 'p' }] });
		});
	});

	describe('the inner component is only an element name', () => {
		test('an outer component that never renders its children gives the inner element its contents', () => {
			expect(
				composeIdentity({ element: 'Pic', slots: null, contents: [{ element: 'img' }] }, 'picture'),
			).toStrictEqual({ element: 'picture', slots: null, contents: [{ element: 'img' }] });
		});

		test('an outer component that renders its children keeps the default slot implicit', () => {
			expect(
				composeIdentity(
					{ element: 'Pic', slots: true, contents: [{ slot: true }, { element: 'img' }] },
					'picture',
				),
			).toStrictEqual({ element: 'picture', contents: [{ slot: true }, { element: 'img' }] });
		});

		test('an outer component that renders its children and hands over nothing else gives the name only', () => {
			expect(composeIdentity({ element: 'Base', slots: true }, 'details')).toBe('details');
		});
	});

	describe('what the outer component hands over is not described', () => {
		test('slots: null without contents hands over nothing', () => {
			expect(composeIdentity({ element: 'Base', slots: null }, { element: 'div', slots: true })).toStrictEqual({
				element: 'div',
				slots: null,
			});
		});

		test('the wrapper of the outer component wins over the wrapper of the inner one', () => {
			expect(
				composeIdentity(
					{ element: 'Card', slots: [{ element: 'p' }] },
					{ element: 'div', slots: [{ element: 'ul' }] },
				),
			).toStrictEqual({ element: 'div', slots: [{ element: 'p' }] });
		});

		test('the attributes of the outer component are not composed', () => {
			expect(
				composeIdentity(
					{
						element: 'Pic',
						attrs: [{ name: 'class', value: 'outer' }],
						slots: null,
						contents: [{ element: 'img' }],
					},
					{ element: 'picture', attrs: [{ name: 'id', value: 'inner' }], slots: true },
				),
			).toStrictEqual({
				element: 'picture',
				attrs: [{ name: 'id', value: 'inner' }],
				slots: null,
				contents: [{ element: 'img' }],
			});
		});
	});

	describe('attributes the outer component writes on the inner one', () => {
		test('they are added when the inner component spreads its props', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'type', value: 'submit' }], slots: true },
					{ element: 'button', slots: true, inheritAttrs: true },
				),
			).toStrictEqual({ element: 'button', attrs: [{ name: 'type', value: 'submit' }], slots: true });
		});

		test('they are dropped when the inner component does not spread its props', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'variant', value: 'primary' }], slots: true },
					{ element: 'button', slots: true },
				),
			).toStrictEqual({ element: 'button', slots: true });
		});

		test('the same name with the same value stays as it is', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'type', value: 'button' }], slots: true },
					{ element: 'button', attrs: [{ name: 'type', value: 'button' }], slots: true, inheritAttrs: true },
				),
			).toStrictEqual({ element: 'button', attrs: [{ name: 'type', value: 'button' }], slots: true });
		});

		test('the same name with a different value is dynamic, as which one wins depends on the position of the spread', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'type', value: 'submit' }], slots: true },
					{ element: 'button', attrs: [{ name: 'type', value: 'button' }], slots: true, inheritAttrs: true },
				),
			).toStrictEqual({ element: 'button', attrs: [{ name: 'type', value: { dynamic: true } }], slots: true });
		});

		test('an attribute that only the outer component writes is added after those of the inner one', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'id', value: 'a' }], slots: true },
					{ element: 'button', attrs: [{ name: 'type', value: 'button' }], slots: true, inheritAttrs: true },
				),
			).toStrictEqual({
				element: 'button',
				attrs: [
					{ name: 'type', value: 'button' },
					{ name: 'id', value: 'a' },
				],
				slots: true,
			});
		});

		test('they are added even when the inner component does not render its children', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'alt', value: 'x' }], slots: true },
					{ element: 'img', slots: null, inheritAttrs: true },
				),
			).toStrictEqual({ element: 'img', attrs: [{ name: 'alt', value: 'x' }], slots: null });
		});
	});

	describe('the same attribute written in different ways', () => {
		test('names that differ only in case are one attribute', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'tabIndex', value: '0' }], slots: true },
					{ element: 'button', attrs: [{ name: 'tabindex', value: '-1' }], slots: true, inheritAttrs: true },
				),
			).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'tabindex', value: { dynamic: true } }],
				slots: true,
			});
		});

		test('values that say the same thing agree whatever the order of their keys', () => {
			expect(
				composeIdentity(
					{
						element: 'Base',
						attrs: [{ name: 'aria-label', value: { omitIfMissing: true, fromAttr: 'text' } }],
						slots: true,
					},
					{
						element: 'button',
						attrs: [{ name: 'aria-label', value: { fromAttr: 'text', omitIfMissing: true } }],
						slots: true,
						inheritAttrs: true,
					},
				),
			).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'aria-label', value: { fromAttr: 'text', omitIfMissing: true } }],
				slots: true,
			});
		});
	});

	describe('inheritAttrs', () => {
		test('it holds when both components spread their props', () => {
			expect(
				composeIdentity(
					{ element: 'Base', slots: true, inheritAttrs: true },
					{ element: 'button', slots: true, inheritAttrs: true },
				),
			).toStrictEqual({ element: 'button', slots: true, inheritAttrs: true });
		});

		test('it does not when only the inner component spreads', () => {
			expect(
				composeIdentity(
					{ element: 'Base', slots: true },
					{ element: 'button', slots: true, inheritAttrs: true },
				),
			).toStrictEqual({ element: 'button', slots: true });
		});

		test('it does not when only the outer component spreads', () => {
			expect(
				composeIdentity(
					{ element: 'Base', slots: true, inheritAttrs: true },
					{ element: 'button', slots: true },
				),
			).toStrictEqual({ element: 'button', slots: true });
		});

		test('a bare element name of the outer component spreads nothing', () => {
			expect(composeIdentity('Base', { element: 'button', slots: true, inheritAttrs: true })).toStrictEqual({
				element: 'button',
				slots: true,
			});
		});
	});

	describe('an attribute that takes the value of a prop (fromAttr) of the inner component', () => {
		const inner = {
			element: 'button',
			attrs: [{ name: 'aria-label', value: { fromAttr: 'label', omitIfMissing: true as const } }],
			slots: true as const,
		};

		test('it takes the value that the outer component writes', () => {
			expect(
				composeIdentity({ element: 'Base', attrs: [{ name: 'label', value: 'Save' }], slots: true }, inner),
			).toStrictEqual({ element: 'button', attrs: [{ name: 'aria-label', value: 'Save' }], slots: true });
		});

		test('it is dynamic when the outer component writes an expression', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'label', value: { dynamic: true } }], slots: true },
					inner,
				),
			).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'aria-label', value: { dynamic: true } }],
				slots: true,
			});
		});

		test('it is dynamic when the outer component writes the attribute without a value', () => {
			expect(composeIdentity({ element: 'Base', attrs: [{ name: 'label' }], slots: true }, inner)).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'aria-label', value: { dynamic: true } }],
				slots: true,
			});
		});

		test('it follows a prop of the outer component that the outer component forwards', () => {
			expect(
				composeIdentity(
					{
						element: 'Base',
						attrs: [{ name: 'label', value: { fromAttr: 'text', omitIfMissing: true } }],
						slots: true,
					},
					inner,
				),
			).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'aria-label', value: { fromAttr: 'text', omitIfMissing: true } }],
				slots: true,
			});
		});

		test('it is dynamic when the outer component writes it and spreads its props too', () => {
			expect(
				composeIdentity(
					{
						element: 'Base',
						attrs: [{ name: 'label', value: 'Save' }],
						slots: true,
						inheritAttrs: true,
					},
					inner,
				),
			).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'aria-label', value: { dynamic: true } }],
				slots: true,
			});
		});

		test('it is left as it is when the outer component spreads its props and does not write it', () => {
			expect(composeIdentity({ element: 'Base', slots: true, inheritAttrs: true }, inner)).toStrictEqual(inner);
		});

		test('it is omitted when the outer component neither writes it nor spreads its props', () => {
			expect(composeIdentity({ element: 'Base', slots: true }, inner)).toStrictEqual({
				element: 'button',
				slots: true,
			});
		});

		test('it is omitted when the outer component is only an element name', () => {
			expect(composeIdentity('Base', inner)).toStrictEqual({ element: 'button', slots: true });
		});

		test('it is an empty attribute without omitIfMissing when the outer component neither writes it nor spreads', () => {
			expect(
				composeIdentity(
					{ element: 'Base', slots: true },
					{
						element: 'button',
						attrs: [{ name: 'type', value: { fromAttr: 'kind' } }],
						slots: true,
					},
				),
			).toStrictEqual({ element: 'button', attrs: [{ name: 'type' }], slots: true });
		});

		test('it is resolved in the wrapper of a slot and in the contents too', () => {
			expect(
				composeIdentity(
					{ element: 'Base', attrs: [{ name: 'label', value: 'Save' }], slots: true },
					{
						element: 'div',
						slots: [
							{
								element: 'span',
								attrs: [{ name: 'title', value: { fromAttr: 'label', omitIfMissing: true } }],
								contents: [
									{
										element: 'i',
										attrs: [
											{ name: 'aria-label', value: { fromAttr: 'label', omitIfMissing: true } },
										],
									},
									{ slot: true },
								],
							},
						],
					},
				),
			).toStrictEqual({
				element: 'div',
				slots: [
					{
						element: 'span',
						attrs: [{ name: 'title', value: 'Save' }],
						contents: [{ element: 'i', attrs: [{ name: 'aria-label', value: 'Save' }] }, { slot: true }],
					},
				],
			});
		});

		test('it is resolved in the contents of the root too', () => {
			expect(
				composeIdentity(
					{ element: 'Base', slots: true },
					{
						element: 'div',
						slots: true,
						contents: [
							{
								element: 'i',
								attrs: [{ name: 'aria-label', value: { fromAttr: 'label', omitIfMissing: true } }],
							},
							{ slot: true },
						],
					},
				),
			).toStrictEqual({
				element: 'div',
				slots: true,
				contents: [{ element: 'i' }, { slot: true }],
			});
		});
	});

	describe('through dependencyMapper', () => {
		test('a cycle ends with the identity of the component it came back to, composed no further', () => {
			const [a] = dependencyMapper(
				new Map([
					['A', ['A', { element: 'B', slots: true, contents: [{ slot: true }, { element: 'img' }] }]],
					['B', ['B', { element: 'A', slots: true }]],
				]),
			);

			expect(a).toStrictEqual({
				selector: 'A',
				_via: ['B', '...[Recursive]'],
				as: { element: 'B', slots: true, contents: [{ slot: true }, { element: 'img' }] },
			});
		});

		test('a chain that enters a cycle also ends with the identity of the component it came back to', () => {
			const result = dependencyMapper(
				new Map([
					['X', ['X', { element: 'A', slots: null, contents: [{ element: 'img' }] }]],
					['A', ['A', { element: 'B', slots: true }]],
					['B', ['B', { element: 'A', slots: true }]],
				]),
			);

			expect(result.find(pretender => pretender.selector === 'X')).toStrictEqual({
				selector: 'X',
				_via: ['A', 'B', '...[Recursive]'],
				as: { element: 'B', slots: true },
			});
		});

		test('components that render each other terminate and report the recursion', () => {
			const result = dependencyMapper(
				new Map([
					['A', ['A', { element: 'B', slots: null, contents: [{ element: 'img' }] }]],
					['B', ['B', { element: 'A', slots: true }]],
				]),
			);

			expect(result.map(pretender => pretender.selector)).toStrictEqual(['A', 'B']);
			expect(result.map(pretender => pretender._via?.at(-1))).toStrictEqual(['...[Recursive]', '...[Recursive]']);
		});

		test('Hero -> Pic: the img that Hero always renders is in the contents', () => {
			const img = { element: 'img', attrs: [{ name: 'alt', value: 'Example' }] };

			expect(
				dependencyMapper(
					new Map([
						['Pic', ['Pic', { element: 'picture', slots: true }]],
						['Hero', ['Hero', { element: 'Pic', slots: null, contents: [img] }]],
					]),
				),
			).toStrictEqual([
				{
					selector: 'Hero',
					_via: ['Pic'],
					as: { element: 'picture', slots: null, contents: [img] },
				},
				{ selector: 'Pic', as: { element: 'picture', slots: true } },
			]);
		});

		test('Page -> Hero -> Pic: composes one hop at a time', () => {
			expect(
				dependencyMapper(
					new Map([
						['Pic', ['Pic', { element: 'picture', slots: true }]],
						[
							'Hero',
							['Hero', { element: 'Pic', slots: true, contents: [{ slot: true }, { element: 'img' }] }],
						],
						['Page', ['Page', { element: 'Hero', slots: null, contents: [{ element: 'source' }] }]],
					]),
				),
			).toStrictEqual([
				{
					selector: 'Hero',
					_via: ['Pic'],
					as: { element: 'picture', slots: true, contents: [{ slot: true }, { element: 'img' }] },
				},
				{
					selector: 'Page',
					_via: ['Hero', 'Pic'],
					as: { element: 'picture', slots: null, contents: [{ element: 'source' }, { element: 'img' }] },
				},
				{ selector: 'Pic', as: { element: 'picture', slots: true } },
			]);
		});
	});
});
