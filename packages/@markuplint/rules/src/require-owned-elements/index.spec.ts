import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-owned-elements-valid-001] list with listitem', async () => {
	expect((await mlRuleTest(rule, '<div role="list"><div role="listitem">item</div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[require-owned-elements-valid-002] no role', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[require-owned-elements-invalid-001] list without listitem', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"><div>not a listitem</div></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});

// #3589: empty containers warn with busy suggestion (not error)
test('[require-owned-elements-issue-3589-001] empty ul warns with busy suggestion', async () => {
	const { violations } = await mlRuleTest(rule, '<ul></ul>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<ul>',
		},
	]);
});

test('[require-owned-elements-issue-3589-002] empty div[role=list] warns with busy suggestion', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<div role="list">',
		},
	]);
});

test('[require-owned-elements-issue-3589-003] empty menu warns with busy suggestion', async () => {
	const { violations } = await mlRuleTest(rule, '<menu></menu>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<menu>',
		},
	]);
});

test('[require-owned-elements-issue-3589-004] ul with aria-busy="true" is valid', async () => {
	expect((await mlRuleTest(rule, '<ul aria-busy="true"></ul>')).violations).toStrictEqual([]);
});

// #4068: a pretended component renders owned elements itself (`contents` / `slots`)
const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

const EXPECTS_LISTITEM = 'The "list" role expects the "listitem" role';
const REQUIRES_LISTITEM = 'The child element requires the "listitem" role. Or, require aria-busy="true"';

test('[require-owned-elements-issue-4068-001] the owned element the component renders itself satisfies the role', async () => {
	const { violations } = await mlRuleTest(rule, '<List />', {
		...jsx,
		pretenders: [{ selector: 'List', as: { element: 'ul', contents: [{ element: 'li' }] } }],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-002] rendered elements that are not owned elements do not satisfy the role', async () => {
	const { violations } = await mlRuleTest(rule, '<List />', {
		...jsx,
		pretenders: [{ selector: 'List', as: { element: 'ul', contents: [{ element: 'div' }] } }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: EXPECTS_LISTITEM,
			raw: '<List />',
		},
	]);
});

test('[require-owned-elements-issue-4068-003] children given at the usage site still count next to the rendered elements', async () => {
	const config = {
		...jsx,
		pretenders: [
			{
				selector: 'List',
				as: { element: 'ul', slots: true, contents: [{ element: 'div' }, { slot: true }] },
			},
		],
	};
	expect((await mlRuleTest(rule, '<List><li>a</li></List>', config)).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<List />', config)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: EXPECTS_LISTITEM,
			raw: '<List />',
		},
	]);
});

test('[require-owned-elements-issue-4068-004] children written inside a component that never renders them are not owned', async () => {
	const { violations } = await mlRuleTest(rule, '<List><li>a</li></List>', {
		...jsx,
		pretenders: [{ selector: 'List', as: { element: 'ul', slots: null, contents: [{ element: 'div' }] } }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: EXPECTS_LISTITEM,
			raw: '<List>',
		},
	]);
});

test('[require-owned-elements-issue-4068-005] content of unknown shape (dynamic) may be the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<List />', {
		...jsx,
		pretenders: [{ selector: 'List', as: { element: 'ul', contents: [{ dynamic: true }] } }],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-006] a generic slot wrapper is transparent for ownership in ARIA 1.3', async () => {
	const { violations } = await mlRuleTest(rule, '<List><li>a</li></List>', {
		...jsx,
		rule: { options: { version: '1.3' } },
		pretenders: [
			{
				selector: 'List',
				as: {
					element: 'div',
					attrs: [{ name: 'role', value: 'list' }],
					slots: [{ element: 'div', contents: [{ slot: true }] }],
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-007] a slot wrapper that has a role requiring owned elements is checked and reported on the component', async () => {
	const config = {
		...jsx,
		pretenders: [{ selector: 'Card', as: { element: 'div', slots: [{ element: 'ul' }] } }],
	};
	expect((await mlRuleTest(rule, '<Card><li>a</li></Card>', config)).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<Card />', config)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: REQUIRES_LISTITEM,
			raw: '<Card />',
		},
	]);
	expect((await mlRuleTest(rule, '<Card><p>a</p></Card>', config)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: EXPECTS_LISTITEM,
			raw: '<Card>',
		},
	]);
});

test('[require-owned-elements-issue-4068-008] an explicit role on a slot wrapper owns the children given at the usage site', async () => {
	const { violations } = await mlRuleTest(rule, '<Tabs><button role="tab">A</button></Tabs>', {
		...jsx,
		pretenders: [
			{
				selector: 'Tabs',
				as: { element: 'div', slots: [{ element: 'div', attrs: [{ name: 'role', value: 'tablist' }] }] },
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-009] several slot wrappers leave the owner of the children unknown', async () => {
	const { violations } = await mlRuleTest(rule, '<List />', {
		...jsx,
		pretenders: [
			{
				selector: 'List',
				as: {
					element: 'div',
					attrs: [{ name: 'role', value: 'list' }],
					slots: [
						{ element: 'p', contents: [{ slot: true }] },
						{ element: 'ul', contents: [{ slot: true }] },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-010] a fragment component supplies the owned element in place', async () => {
	const { violations } = await mlRuleTest(rule, '<List><Items /></List>', {
		...jsx,
		pretenders: [
			{ selector: 'List', as: 'ul' },
			{ selector: 'Items', as: { element: '#fragment', contents: [{ element: 'li' }] } },
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-011] a transparent component whose content is unknown may supply the owned element', async () => {
	const config = {
		...jsx,
		rule: { options: { version: '1.3' } },
		pretenders: [
			{ selector: 'List', as: 'ul' },
			{ selector: 'Wrap', as: { element: 'div', contents: [{ dynamic: true }] } },
		],
	};
	expect((await mlRuleTest(rule, '<List><Wrap /></List>', config)).violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-012] a fragment component whose content is unknown may supply the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<List><Items /></List>', {
		...jsx,
		pretenders: [
			{ selector: 'List', as: 'ul' },
			{ selector: 'Items', as: { element: '#fragment', contents: [{ dynamic: true }] } },
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-013] an expression given to a slot wrapper may be the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<Card>{items}</Card>', {
		...jsx,
		pretenders: [{ selector: 'Card', as: { element: 'div', slots: [{ element: 'ul' }] } }],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4068-014] a component that renders none of its own still depends on the usage site', async () => {
	const config = { ...jsx, pretenders: [{ selector: 'List', as: 'ul' }] };
	expect((await mlRuleTest(rule, '<List><li>a</li></List>', config)).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<List><p>a</p></List>', config)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: EXPECTS_LISTITEM,
			raw: '<List>',
		},
	]);
});
