import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

const REQUIRES_LIST = 'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"';

function reportedAt(col: number) {
	return { severity: 'error', line: 1, col, message: REQUIRES_LIST, raw: 'listitem' };
}

test('[require-parent-role-issue-4568-001] the fallback content of a slot is rendered in the host, which has the required role', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="list"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-parent-role-issue-4568-002] a host that does not have the required role is still reported', async () => {
	const code =
		'<div role="group"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>';
	const { violations } = await mlRuleTest(rule, code);
	expect(violations).toStrictEqual([reportedAt(68)]);
});

test('[require-parent-role-issue-4568-003] a light child that a slot takes is rendered where the slot is', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="list"><template shadowrootmode="open"><slot></slot></template><div role="listitem">a</div></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-parent-role-issue-4568-004] the parent of a light child is the parent of the slot that takes it', async () => {
	const code =
		'<div role="list"><template shadowrootmode="open"><div role="group"><slot></slot></div></template><div role="listitem">a</div></div>';
	const { violations } = await mlRuleTest(rule, code);
	expect(violations).toStrictEqual([reportedAt(109)]);
});

test('[require-parent-role-issue-4568-005] a light child that no slot takes is not rendered, so there is no parent to judge', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="group"><template shadowrootmode="open"><slot name="x"></slot></template><div role="listitem">a</div></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-parent-role-issue-4568-006] a slot between the element and the parent is passed through without a shadow root', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"><slot><div role="listitem">fb</div></slot></div>');
	expect(violations).toStrictEqual([]);
});

test('[require-parent-role-issue-4568-007] a slot of a framework is passed through too', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="list"><template shadowrootmode="open"><slot><div role="listitem">fb</div></slot></template></div>',
		svelte,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-parent-role-issue-4568-008] a light child is judged against the host when the assignment is not known', async () => {
	const code =
		'<div role="group"><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template><div role="listitem">a</div></div>';
	const { violations } = await mlRuleTest(rule, code);
	expect(violations).toStrictEqual([reportedAt(120)]);
});
