import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('Trees', () => {
	test('[require-dialog-autofocus-issue-4489-001] a trigger and a dialog in the same template', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><button command="show-modal" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog></template>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 68,
				message:
					'The "dialog" element referenced by a "show-modal" command requires an element with the "autofocus" attribute',
				raw: '<dialog id="d">',
			},
		]);
	});

	test('[require-dialog-autofocus-issue-4489-002] a dialog in another tree is not the target', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button command="show-modal" commandfor="d">Open</button><template><dialog id="d"><p>Content</p></dialog></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-dialog-autofocus-issue-4489-003] an autofocus in the content of a template in the dialog does not count', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><template><button autofocus>x</button></template></dialog>',
		);
		expect(violations).toStrictEqual([
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
});

describe('Dialogs of one id', () => {
	test('[require-dialog-autofocus-issue-4489-004] a dialog is reported for each tree that has its id', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button command="show-modal" commandfor="d">O</button><dialog id="d"></dialog><template><button command="show-modal" commandfor="d">O</button><dialog id="d"></dialog></template>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 55,
				message:
					'The "dialog" element referenced by a "show-modal" command requires an element with the "autofocus" attribute',
				raw: '<dialog id="d">',
			},
			{
				severity: 'warning',
				line: 1,
				col: 143,
				message:
					'The "dialog" element referenced by a "show-modal" command requires an element with the "autofocus" attribute',
				raw: '<dialog id="d">',
			},
		]);
	});
});

describe('Violations', () => {
	test('[require-dialog-autofocus-invalid-001] dialog without autofocus descendant', async () => {
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

	test('[require-dialog-autofocus-invalid-002] case-insensitive: SHOW-MODAL', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="SHOW-MODAL" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(1);
	});

	test('[require-dialog-autofocus-invalid-003] multiple dialogs: one with autofocus, one without', async () => {
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

	test('[require-dialog-autofocus-invalid-004] case-insensitive: Show-Modal (mixed case)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="Show-Modal" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(1);
	});

	test('[require-dialog-autofocus-invalid-005] empty dialog without any children', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"></dialog>',
				)
			).violations.length,
		).toBe(1);
	});
});

describe('No violations', () => {
	test('[require-dialog-autofocus-invalid-006] dialog descendant has autofocus', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus /></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-007] dialog itself has autofocus', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d" autofocus><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-valid-001] dialog not referenced by show-modal', async () => {
		expect((await mlRuleTest(rule, '<dialog id="d"><p>Content</p></dialog>')).violations.length).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-008] command is close (not show-modal)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="close" commandfor="d">Close</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-009] command is toggle-popover (not show-modal)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="toggle-popover" commandfor="d">Toggle</button><div id="d" popover>Popover</div>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-010] commandfor references non-dialog element', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><div id="d"><p>Content</p></div>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-011] commandfor references non-existent id', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="missing">Open</button><dialog id="d"><p>Content</p></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-012] deeply nested autofocus descendant', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><div><div><input autofocus /></div></div></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-013] autofocus with empty string value (boolean attribute)', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus="" /></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-014] autofocus with redundant value', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<button command="show-modal" commandfor="d">Open</button><dialog id="d"><input autofocus="autofocus" /></dialog>',
				)
			).violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-015] duplicate triggers for same dialog report only once', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
<button command="show-modal" commandfor="d">Open 1</button>
<button command="show-modal" commandfor="d">Open 2</button>
<dialog id="d"><p>Content</p></dialog>
`,
		);
		expect(violations.length).toBe(1);
	});

	test('[require-dialog-autofocus-invalid-016] command without commandfor is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<button command="show-modal">Open</button><dialog id="d"><p>Content</p></dialog>'))
				.violations.length,
		).toBe(0);
	});

	test('[require-dialog-autofocus-invalid-017] commandfor without command is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<button commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog>'))
				.violations.length,
		).toBe(0);
	});
});

test('[require-dialog-autofocus-issue-4584-001] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><button command="show-modal" commandfor="d">Open</button><dialog id="d"><p>Content</p></dialog></template>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 68,
			message: '「show-modal」コマンドが参照する「dialog」要素には、「autofocus」属性を持つ要素が必要です',
			raw: '<dialog id="d">',
		},
	]);
});
