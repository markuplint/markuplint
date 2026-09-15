import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('[require-adjacent-popover-invalid-001] Correct', async () => {
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

	test('[require-adjacent-popover-invalid-002] Incorrect', async () => {
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
	test('[require-adjacent-popover-invalid-003] Correct', async () => {
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

	test('[require-adjacent-popover-invalid-004] Correct 2', async () => {
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

	test('[require-adjacent-popover-invalid-005] Incorrect', async () => {
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

	test('[require-adjacent-popover-invalid-006] Incorrect 2', async () => {
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

	test('[require-adjacent-popover-invalid-007] Incorrect 3', async () => {
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

	test('[require-adjacent-popover-invalid-008] Incorrect 4', async () => {
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
	test('[require-adjacent-popover-invalid-009] Correct: toggle-popover', async () => {
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

	test('[require-adjacent-popover-invalid-010] Correct: show-popover', async () => {
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

	test('[require-adjacent-popover-invalid-011] Correct: hide-popover', async () => {
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

	test('[require-adjacent-popover-invalid-012] Incorrect: perceptible content between trigger and target', async () => {
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

	test('[require-adjacent-popover-invalid-013] Correct: non-popover command is ignored', async () => {
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

	test('[require-adjacent-popover-invalid-014] Correct: commandfor without command is ignored', async () => {
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

	test('[require-adjacent-popover-invalid-015] Case-insensitive command value', async () => {
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

	test('[require-adjacent-popover-invalid-016] Incorrect: complex nested case', async () => {
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
