import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

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

test('[require-owned-elements-issue-4527-011] a slot in the shadow root may place the light children, so the host is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="list"><template shadowrootmode="open"><slot></slot></template><p>y</p></div>',
	);
	expect(violations).toStrictEqual([]);
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
