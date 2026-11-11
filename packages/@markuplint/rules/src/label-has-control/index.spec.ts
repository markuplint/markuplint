import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[label-has-control-invalid-001] No control', async () => {
	const { violations } = await mlRuleTest(rule, '<label>foo</label>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<label>',
			message: 'The "label" element should associate with a control',
		},
	]);
});

test('[label-has-control-valid-001] A single control is associated', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input></label>');
	expect(violations).toStrictEqual([]);
});

test('[label-has-control-valid-002] Multiple controls are still associated (excess controls are label-no-multiple-controls’s responsibility)', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input><select></select></label>');
	expect(violations).toStrictEqual([]);
});

test('[label-has-control-valid-003] The `for` attribute counts as an association even without descendants', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="x">foo</label><input id="x">');
	expect(violations).toStrictEqual([]);
});

test('[label-has-control-valid-004] The `as` attribute makes descendants known, and a single control is associated', async () => {
	const { violations } = await mlRuleTest(rule, '<x-label as="label"><input></x-label>');
	expect(violations).toStrictEqual([]);
});

describe('issues', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	test('[label-has-control-issue-4508-001] a control in one branch of a conditional block associates the label', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#if x}<input>{/if}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-002] a control in an each block associates the label', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#each xs as x}<input>{/each}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-003] a conditional block with no element still leaves the label unassociated', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#if x}text{/if}</label>', svelte);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 1,
				raw: '<label>',
				message: 'The "label" element should associate with a control',
			},
		]);
	});

	test('[label-has-control-issue-4508-004] a control only in the else branch associates the label', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#if x}text{:else}<input>{/if}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-005] any element in a branch is enough, as a direct child element is', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#if x}<span></span>{/if}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-006] a control in an await branch associates the label', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#await p}wait{:then}<input>{/await}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-007] a control in an each else branch associates the label', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#each xs as x}{:else}<input>{/each}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-008] a control in a nested conditional block associates the label', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#if a}{#if b}<input>{/if}{/if}</label>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[label-has-control-issue-4508-009] a snippet definition is not a rendered branch', async () => {
		const { violations } = await mlRuleTest(rule, '<label>{#snippet name()}<input>{/snippet}</label>', svelte);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 1,
				raw: '<label>',
				message: 'The "label" element should associate with a control',
			},
		]);
	});

	test('[label-has-control-issue-2392] #2392', async () => {
		const { violations } = await mlRuleTest(rule, '<Component></Component>', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			pretenders: [
				{
					selector: 'Component',
					as: {
						element: 'label',
						inheritAttrs: true,
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});
});
