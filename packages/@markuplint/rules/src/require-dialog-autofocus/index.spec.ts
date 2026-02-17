import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('Violations', () => {
	test('dialog without autofocus descendant', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 58,
				message:
					'The "dialog" element referenced by a "show-modal" command requires an element with the "autofocus" attribute',
				raw: '<dialog id="d">',
			},
		]);
	});

	test('case-insensitive: SHOW-MODAL', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="SHOW-MODAL" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(1);
	});

	test('multiple dialogs: one with autofocus, one without', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<button command="show-modal" commandfor="d1">Open 1</button>
<button command="show-modal" commandfor="d2">Open 2</button>
<dialog id="d1"><input autofocus /></dialog>
<dialog id="d2"><p>No autofocus</p></dialog>
`,
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('<dialog id="d2">');
	});
});

describe('No violations', () => {
	test('dialog descendant has autofocus', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus /></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('dialog itself has autofocus', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d" autofocus><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('dialog not referenced by show-modal', async () => {
		expect((await mlRuleTest(rule, '<dialog id="d"><p>Content</p></dialog>')).violations.length).toBe(0);
	});

	test('command is close (not show-modal)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="close" commandfor="d">Close</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('command is toggle-popover (not show-modal)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="toggle-popover" commandfor="d">Toggle</button><div id="d" popover>Popover</div>',
				)
			).violations.length,
		).toBe(0);
	});

	test('commandfor references non-dialog element', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><div id="d"><p>Content</p></div>',
				)
			).violations.length,
		).toBe(0);
	});

	test('commandfor references non-existent id', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="missing">Open</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('deeply nested autofocus descendant', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><div><div><input autofocus /></div></div></dialog>',
				)
			).violations.length,
		).toBe(0);
	});
});
