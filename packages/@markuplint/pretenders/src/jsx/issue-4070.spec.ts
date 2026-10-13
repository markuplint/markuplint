import type { Pretender } from '@markuplint/ml-config';

import path from 'node:path';

import { beforeAll, describe, expect, test } from 'vitest';

import { jsxScanner } from './index.js';

const fixture = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', '010-issue-4070.tsx');

/**
 * An attribute that forwards a prop of the component: it takes the value that the usage site
 * writes, and is omitted when the usage site does not write it.
 */
const forward = (name: string, prop: string) => ({ name, value: { fromAttr: prop, omitIfMissing: true } });

describe('an attribute that forwards a prop of the component', () => {
	let asOf: (selector: string) => Pretender['as'] | undefined;

	beforeAll(async () => {
		const pretenders = await jsxScanner([fixture]);
		asOf = (selector: string) => pretenders.find(p => p.selector === selector)?.as;
	});

	test('a destructured prop', () => {
		expect(asOf('Destructured')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('a destructured prop under another name is the prop of the original name', () => {
		expect(asOf('Aliased')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('a property of the props object', () => {
		expect(asOf('PropsObject')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('parentheses, `as` and `!` are looked through', () => {
		expect(asOf('Parenthesized')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('a prop with a default value is dynamic, as the usage site may omit it', () => {
		expect(asOf('WithDefault')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'type', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('the rest of the props, spread, is `inheritAttrs` beside the forwarded prop', () => {
		expect(asOf('WithRest')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
			inheritAttrs: true,
		});
	});

	test('a name that the component declares again inside is not trusted to be the prop', () => {
		expect(asOf('Shadowed')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('an expression that does more than name the prop is dynamic', () => {
		expect(asOf('Expression')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('a name that is not a prop is dynamic', () => {
		expect(asOf('Other')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('the first parameter of the function wrapped by forwardRef is the props, not the ref', () => {
		expect(asOf('ForwardRef')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'ref', value: { dynamic: true } }, forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('a `this` parameter is not the props', () => {
		expect(asOf('ThisParam')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('the wrapper of the slot', () => {
		expect(asOf('SlotWrapper')).toStrictEqual({
			element: 'div',
			slots: [{ element: 'span', attrs: [forward('title', 'label')] }],
		});
	});

	test('an element of the contents', () => {
		expect(asOf('RootContents')).toStrictEqual({
			element: 'div',
			slots: true,
			contents: [{ element: 'i', attrs: [forward('aria-label', 'label')] }, { slot: true }],
		});
	});

	test('branches that forward the same prop keep it', () => {
		expect(asOf('SameInBothBranches')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});

	test('branches that forward different props make the attribute dynamic', () => {
		expect(asOf('DifferentInBranches')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('the name of the props object that the component declares again inside is not trusted', () => {
		expect(asOf('ShadowedProps')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('a property read by an index is not a prop that is named', () => {
		expect(asOf('ElementAccess')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('the children under another name are still not an attribute', () => {
		expect(asOf('ChildrenAlias')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'data-content', value: { dynamic: true } }],
			slots: null,
			contents: [{ dynamic: true }],
		});
	});

	test('a property of the rest of the props is not a prop that is named', () => {
		expect(asOf('RestMember')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('the children are not an attribute of the usage site', () => {
		expect(asOf('ChildrenAsAttribute')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'data-content', value: { dynamic: true } }],
			slots: null,
		});
	});
});
