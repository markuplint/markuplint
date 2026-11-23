import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[require-owned-elements-valid-001] list with listitem', async () => {
	expect((await mlRuleTest(rule, '<div role="list"><div role="listitem">item</div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[require-owned-elements-valid-002] no role', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[require-owned-elements-valid-003] a listbox that owns an option through aria-owns', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="listbox" aria-owns="existing-id nonexistent-id">Listbox</div><div id="existing-id" role="option">Option 1</div>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-owned-elements-valid-004] a listbox that owns, through aria-owns, a generic with an option in it', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="listbox" aria-owns="id1"></div><div id="id1"><div><div role="option">option text</div></div></div>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-owned-elements-invalid-001] list without listitem', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"><div>not a listitem</div></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});

test('[require-owned-elements-invalid-002] a child that another element owns through aria-owns is not a child of its parent', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="listbox"><div id="o" role="option"></div></div><div role="group" aria-owns="o"></div>',
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the roles: "group > option", "option". Or, require aria-busy="true"',
			raw: '<div role="listbox">',
		},
	]);
});

test('[require-owned-elements-invalid-003] aria-owns in a declarative shadow root moves the child it refers to', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="list"><template shadowrootmode="open"><div role="listitem" id="i"></div><div role="group" aria-owns="i"></div></template></div>',
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "list" role expects the "listitem" role',
			raw: '<div role="list">',
		},
	]);
});

test('[require-owned-elements-valid-006] what aria-owns moves is not known in a document with a block of template syntax', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<div role="listbox" aria-owns="o"></div>{#if a}<div id="o" role="listitem"></div>{:else}<div id="o" role="option"></div>{/if}',
				{ parser: { '.*': '@markuplint/svelte-parser' } },
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-owned-elements-valid-005] an aria-owns whose value is not known until it is rendered may own the owned element', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div role="listbox" aria-owns={ids}></div>', {
				parser: { '.*': '@markuplint/jsx-parser' },
			})
		).violations,
	).toStrictEqual([]);
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
		] as const,
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
		rule: { options: { version: '1.3' as const } },
		pretenders: [
			{ selector: 'List', as: 'ul' },
			{ selector: 'Wrap', as: { element: 'div', contents: [{ dynamic: true }] } },
		] as const,
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

test('[require-owned-elements-issue-4584-001] the roles are shown as written with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="listbox"></div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: '子要素にロール: 「group > option」「option」が必要です。または、aria-busy="true"が必要です',
			raw: '<div role="listbox">',
		},
	]);
});

test('[require-owned-elements-issue-4584-002] the roles are shown as written (`row` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="table"></div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message:
				'子要素にロール: 「caption」「row」「rowgroup > row」が必要です。または、aria-busy="true"が必要です',
			raw: '<div role="table">',
		},
	]);
});

test('[require-owned-elements-issue-4435-001] aria-busy that is a literal is what a string is: the contents are loading', async () => {
	const { violations } = await mlRuleTest(rule, '<ul role="list" aria-busy={true}></ul>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-002] aria-busy of a string literal is the same', async () => {
	const { violations } = await mlRuleTest(rule, '<ul role="list" aria-busy={"true"}></ul>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-003] aria-busy that is false is not', async () => {
	const { violations } = await mlRuleTest(rule, '<ul role="list" aria-busy={false}></ul>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<ul role="list" aria-busy={false}>',
		},
	]);
});

test('[require-owned-elements-issue-4435-004] the component that has aria-busy={true} is as the element is', async () => {
	const { violations } = await mlRuleTest(rule, '<BusyList />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'BusyList',
				as: {
					element: 'ul',
					attrs: [
						{ name: 'role', value: 'list' },
						{ name: 'aria-busy', value: { expression: 'true' } },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-005] the component that has aria-busy={"true"} is as the element is', async () => {
	const { violations } = await mlRuleTest(rule, '<BusyList />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'BusyList',
				as: {
					element: 'ul',
					attrs: [
						{ name: 'role', value: 'list' },
						{ name: 'aria-busy', value: { expression: '"true"' } },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-006] the component that has aria-busy={false} is as the element is', async () => {
	const { violations } = await mlRuleTest(rule, '<BusyList />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'BusyList',
				as: {
					element: 'ul',
					attrs: [
						{ name: 'role', value: 'list' },
						{ name: 'aria-busy', value: { expression: 'false' } },
					],
				},
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<BusyList />',
		},
	]);
});

test('[require-owned-elements-issue-4435-007] a component that no pretender resolved may render the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="tablist" aria-label="Examples"><Tab /></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4435-008] an element that is not the owned element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="tablist"><span></span></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "tablist" role expects the "tab" role',
			raw: '<div role="tablist">',
		},
	]);
});

describe('issue-4527', () => {
	const REQUIRES_LISTITEM = 'The child element requires the "listitem" role. Or, require aria-busy="true"';
	const EXPECTS_LISTITEM = 'The "list" role expects the "listitem" role';

	const nunjucks = { parser: { '.*': '@markuplint/nunjucks-parser' } };
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
	const pretendedHost = { pretenders: [{ selector: 'x-list', as: { element: 'div', inheritAttrs: true } }] };
	const unknownFragment = {
		pretenders: [{ selector: 'x-items', as: { element: '#fragment', contents: [{ dynamic: true as const }] } }],
	};

	function reportedAt(line: number, message: string, raw = '<div role="list">') {
		return { severity: 'error', line, col: 1, message, raw };
	}

	test('[require-owned-elements-issue-4527-001] the elements of a declarative shadow root are owned by its host', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-002] a closed shadow root is rendered in its host too', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="closed"><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-003] a host whose shadow root is empty is reported, whatever its light children are', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"></template><div role="listitem">y</div></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, REQUIRES_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-004] a host whose shadow root has no owned element is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><p>x</p></template></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-005] a transparent element in the shadow root is passed through', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div role="none"><div role="listitem">x</div></div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-006] an element that cannot be a shadow host keeps the template an ordinary one', async () => {
		const { violations } = await mlRuleTest(rule, '<ul><template shadowrootmode="open"><li>x</li></template></ul>');
		expect(violations).toStrictEqual([reportedAt(1, REQUIRES_LISTITEM, '<ul>')]);
	});

	test('[require-owned-elements-issue-4527-007] a light child that no slot places is not rendered, so it is not owned', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><p>x</p></template><div role="listitem">y</div></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-008] a shadow root nested in a transparent child is owned through it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><div role="none"><template shadowrootmode="open"><div role="listitem">x</div></template></div></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-009] the content of an ordinary template is not owned', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, REQUIRES_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-010] the content of an ordinary template in a transparent child is not owned', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><div role="none"><template><div role="listitem">x</div></template></div></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-011] a slot in the shadow root places the light children, so the host is reported when none of them is owned', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><p>y</p></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-012] a mutable light child that no slot places does not keep the host from being reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><p>x</p></template>{#if a}<div role="listitem">y</div>{/if}</div>',
			svelte,
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-013] mutable content in the shadow root may be the owned element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open">{% if a %}<div role="listitem">y</div>{% endif %}</template></div>',
			nunjucks,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-014] a pretended host reads its declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-list role="list"><template shadowrootmode="open"><div role="listitem">x</div></template></x-list>',
			pretendedHost,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-015] a pretended host whose shadow root has no owned element is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<x-list role="list"><template shadowrootmode="open"><p>x</p></template></x-list>',
			pretendedHost,
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM, '<x-list role="list">')]);
	});

	test('[require-owned-elements-issue-4527-016] a fragment component of unknown content in the shadow root may supply the owned element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><x-items></x-items></template></div>',
			unknownFragment,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-017] the same holds for a shadow root in a transparent child', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><div role="none"><template shadowrootmode="open"><x-items></x-items></template></div></div>',
			unknownFragment,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-018] only the first template that asks for a shadow root declares it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><p>z</p></template><template shadowrootmode="open"><div role="listitem">x</div></template></div>\n' +
				'<div role="list"><template shadowrootmode="open"><div role="listitem">x</div></template><template shadowrootmode="open"><p>z</p></template></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, EXPECTS_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-019] a template with an invalid mode is an ordinary one', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="foo"><div role="listitem">x</div></template></div>',
		);
		expect(violations).toStrictEqual([reportedAt(1, REQUIRES_LISTITEM)]);
	});

	test('[require-owned-elements-issue-4527-020] whitespace around the template does not change what the host owns', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list">\n  <template shadowrootmode="open">\n    <div role="listitem">x</div>\n  </template>\n</div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-021] aria-busy on an element in the shadow root stops the check', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div aria-busy="true"></div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-022] a mode that is not known until rendered leaves the host unreported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode={mode}><p>x</p></template></div>',
			{ parser: { '.*': '@markuplint/jsx-parser' } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-023] a shadow root declared under a condition leaves what the host owns unknown', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list">{#if a}<template shadowrootmode="open"><p>x</p></template>{/if}<div role="listitem">y</div></div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-024] a block whose range the syntax tree does not give leaves it unknown too', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list">{% if a %}<template shadowrootmode="open"><p>x</p></template>{% endif %}<div role="listitem">y</div></div>',
			nunjucks,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4527-025] a component that drops its children owns none of them', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<List role="list"><template shadowrootmode="open"><div role="listitem">x</div></template></List>',
			{
				parser: { '.*': '@markuplint/svelte-parser' },
				pretenders: [{ selector: 'List', as: { element: 'div', inheritAttrs: true, slots: null } }],
			},
		);
		expect(violations).toStrictEqual([reportedAt(1, REQUIRES_LISTITEM, '<List role="list">')]);
	});
});

describe('issue-4569', () => {
	const EXPECTS_LISTITEM = 'The "list" role expects the "listitem" role';

	const nunjucks = { parser: { '.*': '@markuplint/nunjucks-parser' } };
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

	function reported() {
		return { severity: 'error', line: 1, col: 1, message: EXPECTS_LISTITEM, raw: '<div role="list">' };
	}

	test('[require-owned-elements-issue-4569-001] a slot in a p does not place anything as an owned element of the list', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><p><slot></slot></p></div>');
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-002] a slot in a p of the shadow root places the light children under the p', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><p><slot></slot></p></template><p>a</p></div>',
		);
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-003] a slot of an inner shadow root places the light children of the inner host, not those of the list', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div><template shadowrootmode="open"><slot></slot></template></div></template></div>',
		);
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-004] a light child that a slot of the shadow root takes is an owned element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><div role="listitem">y</div></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-005] a slot reached through an element that is transparent for ownership places its light children', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><div><slot></slot></div></template><div role="listitem">y</div></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-006] the fallback children of a slot that takes none are owned', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-007] the fallback children of a slot that takes none are judged as any other', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot><p>fb</p></slot></template></div>',
		);
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-008] the fallback children of a slot are not owned when a node is assigned to it', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template><p>y</p></div>',
		);
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-009] manual slot assignment is not known, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template><p>y</p></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-010] a slot of a framework is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template></div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-011] a slot that is not in a shadow root may render anything, so the element is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><slot></slot></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-012] an output of a template language among the light children may be what the slot places', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template>{{ item }}</div>',
			nunjucks,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-013] a slot whose assignment is not known, reached through an element that is transparent for ownership, keeps the host from being reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open" shadowrootslotassignment="manual"><div><slot></slot></div></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-014] a slot in an element that is not transparent for ownership in ARIA 1.2 places nothing as an owned element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open" shadowrootslotassignment="manual"><div><slot></slot></div></template></div>',
			{ rule: { options: { version: '1.2' as const } } },
		);
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-015] a light child that a slot takes and that has a mutable attribute may be the owned element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><p className={name}>y</p></div>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-016] a light child that a slot takes is judged as any other when its attributes are static', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><p className="x">y</p></div>',
			jsx,
		);
		expect(violations).toStrictEqual([reported()]);
	});

	test('[require-owned-elements-issue-4569-017] a light child that is a slot of unknown assignment may render anything', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><slot></slot></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-018] a slot of unknown assignment inside a light child that is transparent for ownership may render anything', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template><div><slot></slot></div></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-019] a slot of Vue is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div role="list"><template shadowrootmode="open"><slot></slot></template></div></template>',
			vue,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4569-020] a slot of Astro is not the HTML slot, so the host is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><template shadowrootmode="open"><slot></slot></template></div>',
			astro,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('issue-4580', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	test('[require-owned-elements-issue-4580-001] an expression in a branch of a conditional block may render the owned element', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list">{#if a}{item}{/if}</div>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4580-002] a component in a branch of a conditional block may render the owned element', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list">{#if a}<Item />{/if}</div>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4580-003] an owned element in a branch is an owned element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list">{#if a}<div role="listitem">a</div>{/if}</div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-owned-elements-issue-4580-004] an expression in a loop block may render the owned element', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list">{#each xs as x}{x}{/each}</div>', svelte);
		expect(violations).toStrictEqual([]);
	});
});

describe('issue-4744', () => {
	/**
	 * What the framework renders away is not an element of the output, so what is written in it is owned by
	 * what is above it: Vue renders a `<template>` that has `v-if`, `v-else-if`, `v-else`, `v-for` or `v-slot` away.
	 * It holds without `@markuplint/vue-spec`, as the parser says it.
	 */
	const vueWithoutSpec = {
		parser: { '.*': '@markuplint/vue-parser' },
		pretenders: [{ selector: 'List', as: 'ul' }],
	};
	const vue = { ...vueWithoutSpec, specs: { '.*': '@markuplint/vue-spec' } };

	describe.each([
		['with @markuplint/vue-spec', vue],
		['without @markuplint/vue-spec', vueWithoutSpec],
	])('Vue %s', (_, config) => {
		test.each([
			['v-if', '<ul><template v-if="x"><li>a</li></template></ul>'],
			['v-else', '<ul><template v-if="x"><li>a</li></template><template v-else><li>b</li></template></ul>'],
			['v-for', '<ul><template v-for="i in xs" :key="i"><li>a</li></template></ul>'],
			['a default slot', '<List><template #default><li>a</li></template></List>'],
			['a named slot', '<List><template #item><li>a</li></template></List>'],
		])('[require-owned-elements-issue-4744-001] %s is not reported', async (_, code) => {
			const { violations } = await mlRuleTest(rule, `<template>${code}</template>`, config);
			expect(violations).toStrictEqual([]);
		});

		test.each([
			['a template of v-if', '<ul><template v-if="x"><p>a</p></template></ul>'],
			['a named slot', '<List><template #item><p>a</p></template></List>'],
			['a dynamic slot', '<List><template #[name]><p>a</p></template></List>'],
		])(
			'[require-owned-elements-issue-4744-006] %s may be rendered anywhere, or not at all, so what is in it is not judged',
			async (_, code) => {
				const { violations } = await mlRuleTest(rule, `<template>${code}</template>`, config);
				expect(violations).toStrictEqual([]);
			},
		);

		test('[require-owned-elements-issue-4744-002] an element that is not rendered away does not own what is in it', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><ul><template><li>a</li></template></ul></template>',
				config,
			);
			expect(violations.map(v => v.raw)).toStrictEqual(['<ul>']);
		});
	});

	describe('Vue without @markuplint/vue-spec', () => {
		test('[require-owned-elements-issue-4744-003] a template with v-show stays an element, so it owns nothing', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><ul><template v-show="x"><li>a</li></template></ul></template>',
				vueWithoutSpec,
			);
			expect(violations.map(v => v.raw)).toStrictEqual(['<ul>']);
		});
	});

	describe('Svelte', () => {
		test('[require-owned-elements-issue-4744-008] a block is not reported, as before', async () => {
			const { violations } = await mlRuleTest(rule, '<ul>{#if a}<li>1</li>{/if}</ul>', {
				parser: { '.*': '@markuplint/svelte-parser' },
			});
			expect(violations).toStrictEqual([]);
		});
	});

	describe('Fragments', () => {
		test('[require-owned-elements-issue-4744-004] a fragment of JSX is not what the element owns', async () => {
			const { violations } = await mlRuleTest(rule, 'const a = <ul><><li>a</li></></ul>;', {
				parser: { '.*': '@markuplint/jsx-parser' },
			});
			expect(violations).toStrictEqual([]);
		});

		test('[require-owned-elements-issue-4744-005] a fragment of JSX is not an owned element itself', async () => {
			const { violations } = await mlRuleTest(rule, 'const a = <ul><><p>a</p></></ul>;', {
				parser: { '.*': '@markuplint/jsx-parser' },
			});
			expect(violations.map(v => v.raw)).toStrictEqual(['<ul>']);
		});
	});
});

describe('issue-4748', () => {
	/**
	 * Whether a loop renders anything is known only at run time, so the body of a loop is owned as it is written:
	 * a list whose items are all in a loop is not reported, though it owns none when the loop has no items.
	 */
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };
	const vueWithSpec = { ...vue, specs: { '.*': '@markuplint/vue-spec' } };

	describe('The body of a loop', () => {
		test('[require-owned-elements-issue-4748-001] {#each} of Svelte is owned as it is written', async () => {
			const { violations } = await mlRuleTest(rule, '<ul>{#each xs as i}<li>a</li>{/each}</ul>', {
				parser: { '.*': '@markuplint/svelte-parser' },
			});
			expect(violations).toStrictEqual([]);
		});

		test.each([
			['without @markuplint/vue-spec', vue],
			['with @markuplint/vue-spec', vueWithSpec],
		])(
			'[require-owned-elements-issue-4748-002] <template v-for> of Vue is owned as it is written %s',
			async (_, config) => {
				const { violations } = await mlRuleTest(
					rule,
					'<template><ul><template v-for="i in xs"><li>a</li></template></ul></template>',
					config,
				);
				expect(violations).toStrictEqual([]);
			},
		);

		test.each([
			['without @markuplint/vue-spec', vue],
			['with @markuplint/vue-spec', vueWithSpec],
		])(
			'[require-owned-elements-issue-4748-003] an element with v-for of Vue is owned as it is written %s',
			async (_, config) => {
				const { violations } = await mlRuleTest(
					rule,
					'<template><ul><li v-for="i in xs">a</li></ul></template>',
					config,
				);
				expect(violations).toStrictEqual([]);
			},
		);
	});
});

describe('issue-4789', () => {
	const parser = { '.*': '@markuplint/jsx-parser' };

	test('[require-owned-elements-issue-4789-001] JSX: an element whose role is not known until it is rendered does not need what its implicit role needs', async () => {
		const source = [
			'<>',
			'<ul role={props.role}><div>x</div></ul>',
			'<ul {...props}><div>y</div></ul>',
			'<ul role="list" {...props}><div>z</div></ul>',
			'</>',
		].join('\n');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

		// Control: the role that the markup tells is judged
		const { violations } = await mlRuleTest(rule, '<ul><div>x</div></ul>', { parser });
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
	});

	test('[require-owned-elements-issue-4789-002] JSX: a child whose role is not known until it is rendered may be the owned role', async () => {
		const source = [
			'<>',
			'<ul><div role={props.role}>x</div></ul>',
			'<ul><div {...props}>y</div></ul>',
			// `group` is not the owned role: the spread after it may bring `listitem`
			'<ul><div role="group" {...props}>z</div></ul>',
			'</>',
		].join('\n');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

		// Control: a child that has no attribute that may change, and whose role the markup tells, is judged
		expect((await mlRuleTest(rule, '<ul><div role="group">x</div></ul>', { parser })).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
	});

	test('[require-owned-elements-issue-4789-003] JSX: the role that the element has is the one written where no spread attribute is after it', async () => {
		expect(
			(await mlRuleTest(rule, '<ul role="list" {...props}><div>x</div></ul>', { parser })).violations,
		).toStrictEqual([]);

		// Control: the spread is before the `role` attribute, so the role is the one written
		expect(
			(await mlRuleTest(rule, '<ul {...props} role="list"><div>x</div></ul>', { parser })).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul {...props} role="list">',
			},
		]);
	});
});
