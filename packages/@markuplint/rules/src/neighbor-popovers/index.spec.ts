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
