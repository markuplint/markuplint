import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
const alpine = { parser: { '.*': '@markuplint/alpine-parser' } };
const astro = { parser: { '.*': '@markuplint/astro-parser' } };
const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
const vue = { parser: { '.*': '@markuplint/vue-parser' } };
const vueWithSpec = { ...vue, specs: { '.*': '@markuplint/vue-spec' } };
const reactWithSpec = { ...jsx, specs: { '.*': '@markuplint/react-spec' } };

const REQUIRE_NAME = {
	severity: 'error',
	line: 1,
	col: 1,
	message: 'Require accessible name',
	raw: '<div role="button">',
};

test.each([
	['if', '<div role="button">{#if a}Save{/if}</div>'],
	['if and else', '<div role="button">{#if a}Save{:else}Cancel{/if}</div>'],
	['if and else, the name in the else only', '<div role="button">{#if a}<span></span>{:else}Cancel{/if}</div>'],
	['await', '<div role="button">{#await p}Loading{:then v}Done{/await}</div>'],
	['each and its empty branch', '<div role="button">{#each xs as x}{:else}Empty{/each}</div>'],
	['a child element', '<div role="button"><span>{#if a}Save{/if}</span></div>'],
	['a nested block', '<div role="button">{#if a}{#if b}Save{/if}{/if}</div>'],
	[
		'an element that aria-labelledby refers to',
		'<div role="button" aria-labelledby="l"></div><span id="l">{#if a}Save{/if}</span>',
	],
	['a name of an image', '<div role="button">{#if a}<img src="a.png" alt="Save">{/if}</div>'],
])(
	'[require-accessible-name-issue-4580-001] a branch of a conditional block gives the name: %s (Svelte)',
	async (_, code) => {
		const { violations } = await mlRuleTest(rule, code, svelte);
		expect(violations).toStrictEqual([]);
	},
);

test('[require-accessible-name-issue-4580-002] unknown content in a branch may be the name (Svelte)', async () => {
	expect((await mlRuleTest(rule, '<div role="button">{#if a}{label}{/if}</div>', svelte)).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<div role="button">{#if a}<Comp />{/if}</div>', svelte)).violations).toStrictEqual(
		[],
	);
});

test('[require-accessible-name-issue-4580-003] no branch gives a name, so the element is reported (Svelte)', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="button">{#if a}<span></span>{/if}</div>', svelte)).violations,
	).toStrictEqual([REQUIRE_NAME]);
	expect(
		(await mlRuleTest(rule, '<div role="button">{#if a}<span></span>{:else}<b></b>{/if}</div>', svelte)).violations,
	).toStrictEqual([REQUIRE_NAME]);
	expect((await mlRuleTest(rule, '<div role="button">{#if a}{/if}</div>', svelte)).violations).toStrictEqual([
		REQUIRE_NAME,
	]);
});

test('[require-accessible-name-issue-4580-004] a branch that is hidden does not give the name (Svelte)', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="button">{#if a}<span hidden>Save</span>{/if}</div>', svelte)).violations,
	).toStrictEqual([REQUIRE_NAME]);
});

test('[require-accessible-name-issue-4580-005] an x-if template of Alpine.js is a branch that gives the name', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="button"><template x-if="a">Save</template></div>', alpine)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<div role="button"><template x-if="a"><span></span></template></div>', alpine))
			.violations,
	).toStrictEqual([REQUIRE_NAME]);
});

test('[require-accessible-name-issue-4580-006] a filter of Astro is a branch that gives the name', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="button">{xs.filter(x => <span>Save</span>)}</div>', astro)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<div role="button">{xs.filter(x => <span></span>)}</div>', astro)).violations,
	).toStrictEqual([REQUIRE_NAME]);
});

test('[require-accessible-name-issue-4580-007] the first of the candidates is not the only one that gives the name (Svelte)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<fieldset role="img">{#if a}<legend></legend>{:else}<legend>Name</legend>{/if}</fieldset>',
				svelte,
			)
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(
				rule,
				'<table role="treegrid">{#if a}<caption></caption>{:else}<caption>Name</caption>{/if}</table>',
				svelte,
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-008] the name from a legend or a caption that is in no branch is not given (Svelte)', async () => {
	expect(
		(await mlRuleTest(rule, '<fieldset role="img">{#if a}<legend></legend>{/if}</fieldset>', svelte)).violations,
	).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<fieldset role="img">' },
	]);
});

test('[require-accessible-name-issue-4580-009] the content of a template of Vue is rendered where it is written, with or without the spec', async () => {
	const code = '<template><div role="button"><template v-if="a">Save</template></div></template>';
	expect((await mlRuleTest(rule, code, vue)).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, code, vueWithSpec)).violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-010] the content of a template of JSX is rendered where it is written, with the spec of React', async () => {
	const code = '<div role="button"><template>Save</template></div>';
	expect((await mlRuleTest(rule, code, reactWithSpec)).violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-011] the content of an HTML template is not rendered where it is written', async () => {
	expect((await mlRuleTest(rule, '<div role="button"><template>Save</template></div>')).violations).toStrictEqual([
		REQUIRE_NAME,
	]);
});

test('[require-accessible-name-issue-4580-012] a later legend is not taken when an earlier legend is always rendered (Svelte)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<fieldset role="img">{#if a}x{/if}<legend></legend><legend>Name</legend></fieldset>',
				svelte,
			)
		).violations,
	).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<fieldset role="img">' },
	]);
});

test('[require-accessible-name-issue-4580-013] a legend after one that a branch may leave out may be the one that names the element (Svelte)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<fieldset role="img">{#if a}<legend></legend>{/if}<legend>Name</legend></fieldset>',
				svelte,
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-014] the content of a bare template of Vue is rendered where it is written, without the spec', async () => {
	const code = '<template><div role="button"><template>Save</template></div></template>';
	expect((await mlRuleTest(rule, code, vue)).violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-015] a legend of a v-else branch may be the one that names the element (Vue)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><fieldset role="img"><legend v-if="a"></legend><legend v-else>Name</legend></fieldset></template>',
				vue,
			)
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><fieldset role="img"><legend v-if="a"></legend><legend v-else></legend></fieldset></template>',
				vue,
			)
		).violations,
	).toStrictEqual([
		{ severity: 'error', line: 1, col: 11, message: 'Require accessible name', raw: '<fieldset role="img">' },
	]);
});

test('[require-accessible-name-issue-4580-016] a legend of the empty clause of a loop may be the one that names the element (Svelte)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<fieldset role="img">{#each xs as x}<legend></legend>{:else}<legend>Name</legend>{/each}</fieldset>',
				svelte,
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-017] a legend that a loop may leave out is not the only candidate (Svelte)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<fieldset role="img">{#each xs as x}<legend></legend>{/each}<legend>Name</legend></fieldset>',
				svelte,
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-accessible-name-issue-4580-018] a legend or a caption in a template that has a directive of Vue is read as a child of the element', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><fieldset role="img"><template v-if="a"><legend>Name</legend></template></fieldset></template>',
				vue,
			)
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><fieldset role="img"><template v-for="x in xs"><legend>Name</legend></template></fieldset></template>',
				vue,
			)
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><table role="treegrid"><template v-if="a"><caption>Name</caption></template></table></template>',
				vue,
			)
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><fieldset role="img"><template v-if="a"><legend></legend></template></fieldset></template>',
				vue,
			)
		).violations,
	).toStrictEqual([
		{ severity: 'error', line: 1, col: 11, message: 'Require accessible name', raw: '<fieldset role="img">' },
	]);
});

test('[require-accessible-name-issue-4580-019] the title of an SVG that a v-if may leave out is not the only candidate (Vue)', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<template><svg role="img"><title v-if="a"></title><title v-else>Name</title></svg></template>',
				vue,
			)
		).violations,
	).toStrictEqual([]);
});
