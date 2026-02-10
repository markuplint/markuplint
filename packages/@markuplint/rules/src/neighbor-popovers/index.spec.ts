import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

describe('Basic', () => {
	test('Correct', async () => {
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

	test('Incorrect', async () => {
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
				severity: 'error',
				line: 3,
				col: 4,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Paragraph',
			},
		]);
	});
});

describe('Complex', () => {
	test('Correct', async () => {
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

	test('Correct 2', async () => {
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

	test('Incorrect', async () => {
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

	test('Incorrect 2', async () => {
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

	test('Incorrect 3', async () => {
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

	test('Incorrect 4', async () => {
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
	test('Correct: toggle-popover', async () => {
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

	test('Correct: show-popover', async () => {
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

	test('Correct: hide-popover', async () => {
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

	test('Incorrect: perceptible content between trigger and target', async () => {
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
				severity: 'error',
				line: 3,
				col: 4,
				message: 'Detected perceptible nodes between the trigger and corresponding target',
				raw: 'Paragraph',
			},
		]);
	});

	test('Correct: non-popover command is ignored', async () => {
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

	test('Correct: commandfor without command is ignored', async () => {
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

	test('Case-insensitive command value', async () => {
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

	test('Incorrect: complex nested case', async () => {
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
