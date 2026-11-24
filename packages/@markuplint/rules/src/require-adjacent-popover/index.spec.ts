import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('Trees', () => {
	test('[require-adjacent-popover-001] a trigger and a popover in the same template', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><button popovertarget="foo">Trigger</button><p>Paragraph</p><div id="foo" popover>Popover</div></template>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 58,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Paragraph',
			},
		]);
	});

	test('[require-adjacent-popover-002] what is in the content of a template is not between the trigger and the popover', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button popovertarget="foo">Trigger</button><template><p>Paragraph</p></template><div id="foo" popover>Popover</div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-adjacent-popover-003] a popover in another tree is not the target', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button popovertarget="foo">Trigger</button><p>Paragraph</p><template><div id="foo" popover>Popover</div></template>',
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('Basic', () => {
	test('[require-adjacent-popover-004] Correct', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button popovertarget="foo">Trigger</button>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-005] Incorrect', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button popovertarget="foo">Trigger</button>
<p>Paragraph</p>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 4,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Paragraph',
			},
		]);
	});
});

describe('Complex', () => {
	test('[require-adjacent-popover-006] Correct', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div>
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-007] Correct 2', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div>
  <div>
    <img src="image.png" alt=""><!-- Image has no accname -->
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-008] Incorrect', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div>
  <h2>Title</h2>
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(1);
	});

	test('[require-adjacent-popover-009] Incorrect 2', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div>
  <img src="image.png" alt="Image">
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(1);
	});

	test('[require-adjacent-popover-010] Incorrect 3', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button popovertarget="foo">Trigger</button>
  <input type="text" />
</div>

<div>
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(1);
	});

	test('[require-adjacent-popover-011] Incorrect 4', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button popovertarget="foo">Trigger</button>
</div>

<div tabindex="0">
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(1);
	});
});

describe('Invoker Commands API (commandfor + command)', () => {
	test('[require-adjacent-popover-012] Correct: toggle-popover', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button command="toggle-popover" commandfor="foo">Trigger</button>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-013] Correct: show-popover', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button command="show-popover" commandfor="foo">Trigger</button>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-014] Correct: hide-popover', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button command="hide-popover" commandfor="foo">Trigger</button>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-015] Incorrect: perceptible content between trigger and target', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button command="toggle-popover" commandfor="foo">Trigger</button>
<p>Paragraph</p>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'warning',
				line: 3,
				col: 4,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Paragraph',
			},
		]);
	});

	test('[require-adjacent-popover-016] Correct: non-popover command is ignored', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button command="close" commandfor="foo">Trigger</button>
<p>Paragraph</p>
<dialog id="foo">Dialog</dialog>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-017] Correct: commandfor without command is ignored', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button commandfor="foo">Trigger</button>
<p>Paragraph</p>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-adjacent-popover-018] Case-insensitive command value', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<button command="TOGGLE-POPOVER" commandfor="foo">Trigger</button>
<p>Paragraph</p>
<div id="foo" popover>Popover</div>
  `,
				)
			).violations.length,
		).toBe(1);
	});

	test('[require-adjacent-popover-019] Incorrect: complex nested case', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<div>
  <button command="toggle-popover" commandfor="foo">Trigger</button>
</div>

<div>
  <h2>Title</h2>
  <div>
    <div id="foo" popover>Popover</div>
  </div>
</div>
  `,
				)
			).violations.length,
		).toBe(1);
	});
});

describe('a branch of a conditional block between the trigger and the popover', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	test('[require-adjacent-popover-020] the text in a branch of a conditional block between the trigger and the popover is reported itself', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button popovertarget="foo">Trigger</button><div role="img">{#if a}<span role="none">Name</span>{/if}</div><div id="foo" popover>Popover</div>',
			svelte,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 86,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Name',
			},
		]);
	});

	test('[require-adjacent-popover-021] a branch that has no perceptible node between the trigger and the popover is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button popovertarget="foo">Trigger</button><div role="img">{#if a}<span></span>{/if}</div><div id="foo" popover>Popover</div>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('an element that a pretender declares', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
	const pop = (selector: string) => ({
		selector,
		as: {
			element: 'div',
			contents: [
				{
					element: 'div',
					attrs: [{ name: 'id', value: 'foo' }, { name: 'popover' }],
				},
				{ slot: true as const },
			],
		},
	});

	test('[require-adjacent-popover-022] adjacency is not decided against a popover that a component renders', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><button popovertarget="foo">Trigger</button><Pop>Text</Pop></>',
			{
				...jsx,
				pretenders: [pop('Pop')],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-adjacent-popover-023] a popover that is written before the component with the same id is still the target', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><button popovertarget="foo">Trigger</button><p>Text</p><div id="foo" popover>Popover</div><Pop /></>',
			{
				...jsx,
				pretenders: [pop('Pop')],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 50,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Text',
			},
		]);
	});
});
