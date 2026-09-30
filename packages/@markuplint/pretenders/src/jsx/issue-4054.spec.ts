import path from 'node:path';

import { beforeAll, describe, test, expect } from 'vitest';

import { jsxScanner } from './index.js';

const fixture = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', '009-issue-4054.tsx');

describe('jsxScanner: issue #4054', () => {
	let asOf: (selector: string) => unknown;

	beforeAll(async () => {
		const pretenders = await jsxScanner([fixture]);
		asOf = (selector: string) => pretenders.find(pretender => pretender.selector === selector)?.as;
	});

	describe('the reported components', () => {
		test('Button: the conditional `type` is one dynamic attribute, not literals harvested from the expression', () => {
			expect(asOf('Button')).toStrictEqual({
				element: 'button',
				attrs: [
					{ name: 'aria-label', value: 'Save' },
					{ name: 'type', value: { dynamic: true } },
				],
				slots: null,
			});
		});

		test('Tab: `tabIndex` is dynamic instead of an attribute without a value', () => {
			expect(asOf('Tab')).toStrictEqual({
				element: 'button',
				attrs: [
					{ name: 'type', value: 'button' },
					{ name: 'role', value: 'tab' },
					{ name: 'aria-label', value: 'Example' },
					{ name: 'tabIndex', value: { dynamic: true } },
				],
				slots: null,
			});
		});

		test('Chip: no pretender when the returned elements differ between branches', () => {
			expect(asOf('Chip')).toBeUndefined();
		});

		test('Picture: the static child is kept in contents', () => {
			expect(asOf('Picture')).toStrictEqual({
				element: 'picture',
				slots: null,
				contents: [
					{
						element: 'img',
						attrs: [
							{ name: 'src', value: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=' },
							{ name: 'alt', value: 'Example' },
						],
					},
				],
			});
		});
	});

	describe('attribute classification', () => {
		test('literal expressions are static values', () => {
			expect(asOf('Literals')).toStrictEqual({
				element: 'div',
				attrs: [
					{ name: 'tabIndex', value: '0' },
					{ name: 'title', value: 'x' },
					{ name: 'data-n', value: '-1' },
					{ name: 'data-t', value: 't' },
				],
				slots: null,
			});
		});
	});

	describe('return points', () => {
		test('an arrow function nested in the returned element is not a branch', () => {
			expect(asOf('Items')).toStrictEqual({
				element: 'ul',
				slots: null,
				contents: [{ dynamic: true }],
			});
		});

		test('branches rendering the same element keep only the attributes they share', () => {
			expect(asOf('SameBranches')).toStrictEqual({
				element: 'button',
				attrs: [{ name: 'type', value: 'button' }],
				slots: null,
			});
		});

		test('a branch returning null is ignored', () => {
			expect(asOf('NullBranch')).toBe('section');
		});

		test('a branch whose result is not statically known is ignored', () => {
			expect(asOf('ChildrenBranch')).toStrictEqual({ element: 'button', slots: true });
		});

		test('branches that disagree on the slot get an unknown content around the slot', () => {
			expect(asOf('MixedSlotBranches')).toStrictEqual({
				element: 'button',
				slots: true,
				contents: [{ dynamic: true }, { slot: true }],
			});
		});

		test('branches that disagree on the slot wrapper produce no pretender', () => {
			expect(asOf('DivergingWrappers')).toBeUndefined();
		});

		test('memo() and forwardRef() wrappers are looked through', () => {
			expect(asOf('Memo')).toBe('aside');
			expect(asOf('Fwd')).toStrictEqual({
				element: 'nav',
				attrs: [{ name: 'ref', value: { dynamic: true } }],
				slots: null,
			});
		});
	});

	describe('multiple roots', () => {
		test('a fragment with several roots is a #fragment pretender', () => {
			expect(asOf('Fields')).toStrictEqual({
				element: '#fragment',
				slots: null,
				contents: [{ element: 'label' }, { element: 'input' }],
			});
		});

		test('the slot of a fragment is a position among its contents', () => {
			expect(asOf('FragmentWithSlot')).toStrictEqual({
				element: '#fragment',
				slots: true,
				contents: [{ element: 'legend' }, { slot: true }],
			});
		});

		test('a slot nested in an element of a multi-root fragment produces no pretender', () => {
			expect(asOf('FragmentNestedSlot')).toBeUndefined();
		});
	});

	describe('review follow-ups', () => {
		test('an attribute the branches disagree on stays as a dynamic attribute', () => {
			expect(asOf('IconButton')).toStrictEqual({
				element: 'button',
				attrs: [
					{ name: 'aria-label', value: { dynamic: true } },
					{ name: 'type', value: 'button' },
				],
				slots: null,
			});
		});

		test('text beside an element is an unknown content', () => {
			expect(asOf('Kan')).toStrictEqual({
				element: 'ruby',
				slots: null,
				contents: [{ dynamic: true }, { element: 'rt' }],
			});
		});

		test('a provider is transparent even when its pattern has the g flag', async () => {
			expect(asOf('Providers')).toStrictEqual({ element: 'div', slots: true });

			const pretenders = await jsxScanner([fixture], { asFragment: [/\.Provider$/g] });
			expect(pretenders.find(pretender => pretender.selector === 'Providers')?.as).toStrictEqual({
				element: 'div',
				slots: true,
			});
		});

		test('the children used in several places are several slot positions', () => {
			expect(asOf('Figure')).toStrictEqual({
				element: 'figure',
				slots: true,
				contents: [{ slot: true }, { slot: true }],
			});
		});
	});

	describe('slot position and slot wrapper', () => {
		test('children as the only content need no contents', () => {
			expect(asOf('Details')).toStrictEqual({ element: 'details', slots: true });
		});

		test('static content around the slot is kept in order', () => {
			expect(asOf('PictureSlot')).toStrictEqual({
				element: 'picture',
				slots: true,
				contents: [
					{ slot: true },
					{
						element: 'img',
						attrs: [
							{ name: 'src', value: 'a.gif' },
							{ name: 'alt', value: 'x' },
						],
					},
				],
			});
		});

		test('an inner element that directly wraps the children is the slot wrapper', () => {
			expect(asOf('Card')).toStrictEqual({
				element: 'div',
				slots: [{ element: 'p', attrs: [{ name: 'className', value: 'body' }] }],
			});
		});

		test('a component wrapping the children is the slot wrapper by its component name', () => {
			expect(asOf('WrappedByComponent')).toStrictEqual({
				element: 'div',
				slots: [{ element: 'Tooltip' }],
			});
		});

		test('a provider between the element and the children is transparent', () => {
			expect(asOf('WrappedByProvider')).toStrictEqual({ element: 'div', slots: true });
		});

		test('every distinct wrapper is listed when the children appear in several places', () => {
			expect(asOf('TwoWrappers')).toStrictEqual({
				element: 'div',
				slots: [{ element: 'p' }, { element: 'ul' }],
			});
		});

		test('an expression next to the slot is an unknown content', () => {
			expect(asOf('DynamicChild')).toStrictEqual({
				element: 'details',
				slots: true,
				contents: [{ dynamic: true }, { slot: true }],
			});
		});

		test('a component next to the slot is an unknown content', () => {
			expect(asOf('ComponentChild')).toStrictEqual({
				element: 'details',
				slots: true,
				contents: [{ dynamic: true }, { slot: true }],
			});
		});
	});
});
