import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

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
