import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const nunjucks = { parser: { '.*': '@markuplint/nunjucks-parser' } };
const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
const alpine = { parser: { '.*': '@markuplint/alpine-parser' } };
const vue = { parser: { '.*': '@markuplint/vue-parser' } };
const astro = { parser: { '.*': '@markuplint/astro-parser' } };

const REQUIRE_NAME = {
	severity: 'error',
	line: 1,
	col: 1,
	message: 'Require accessible name',
	raw: '<div role="button">',
};

test('[require-accessible-name-issue-4538-001] the nodes assigned to a slot are the name of the host', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template>Save</div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-002] a slot that takes no node uses its fallback children', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot>Fallback</slot></template></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-003] a slot that takes no node and has no fallback leaves the host without a name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
	);
	expect(violations).toStrictEqual([REQUIRE_NAME]);
});

test('[require-accessible-name-issue-4538-004] a light child that no slot takes is not rendered, so it is not the name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot name="a"></slot></template>Save</div>',
	);
	expect(violations).toStrictEqual([REQUIRE_NAME]);
});

test('[require-accessible-name-issue-4538-005] a named slot takes the elements that name it', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot name="a"></slot></template><span slot="a">Save</span></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-006] manual slot assignment is not known, so the host is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-007] a slot of a framework is not the HTML slot, so the host is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
		svelte,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-008] an output of a template language among the light children may be what the slot takes', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template>{{ label }}</div>',
		nunjucks,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-009] a slot that is not in a shadow root may render anything, so the element is not reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><slot></slot></div>');
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-010] the content of an x-if template of Alpine.js is a light child that the slot takes', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template><template x-if="a">Save</template></div>',
		alpine,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-011] a hidden node that a slot takes is not the name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template><span hidden>Save</span></div>',
	);
	expect(violations).toStrictEqual([REQUIRE_NAME]);
});

test('[require-accessible-name-issue-4538-012] a light child that no slot takes is not rendered, so it is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><template shadowrootmode="open"></template><button></button></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-013] a light child that no slot takes is not exposed whatever hides its host', async () => {
	const hidden = await mlRuleTest(
		rule,
		'<div hidden><template shadowrootmode="open"></template><button></button></div>',
	);
	expect(hidden.violations).toStrictEqual([]);
	const ariaHidden = await mlRuleTest(
		rule,
		'<div aria-hidden="true"><template shadowrootmode="open"></template><button></button></div>',
	);
	expect(ariaHidden.violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-014] a light child that a slot takes is reported as any other', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><template shadowrootmode="open"><slot></slot></template><button></button></div>',
	);
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 62, message: 'Require accessible name', raw: '<button>' },
	]);
});

test('[require-accessible-name-issue-4538-015] a slot of Vue is not the HTML slot, so the host is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><div role="button"><template shadowrootmode="open"><slot></slot></template></div></template>',
		vue,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4538-016] a slot of Astro is not the HTML slot, so the host is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button"><template shadowrootmode="open"><slot></slot></template></div>',
		astro,
	);
	expect(violations).toStrictEqual([]);
});
