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

	describe('through dependencyMapper', () => {
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
