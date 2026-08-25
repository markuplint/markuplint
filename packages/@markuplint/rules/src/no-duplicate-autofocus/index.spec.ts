import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-autofocus-valid-001] single autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<div><input autofocus><input></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-valid-002] no autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<div><input><input></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-invalid-001] two autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<div><input autofocus><input autofocus></div>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<input autofocus>',
			line: 1,
			col: 23,
			message: 'The "autofocus" attribute must be unique in the document',
		}),
	]);
});

test('[no-duplicate-autofocus-invalid-002] three autofocus', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><input autofocus><button autofocus>x</button><textarea autofocus></textarea></div>',
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<button autofocus>',
			message: 'The "autofocus" attribute must be unique in the document',
		}),
		expect.objectContaining({
			severity: 'error',
			raw: '<textarea autofocus>',
			message: 'The "autofocus" attribute must be unique in the document',
		}),
	]);
});

test('[no-duplicate-autofocus-valid-003] each dialog has its own autofocus scoping root', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog><input autofocus></dialog><dialog><button autofocus>x</button></dialog>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-valid-004] each popover has its own autofocus scoping root', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div popover><input autofocus></div><div popover><button autofocus>x</button></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-valid-005] a dialog-scoped autofocus does not conflict with a document-level autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<input autofocus><dialog><button autofocus>x</button></dialog>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-invalid-003] two autofocus elements sharing the same dialog scoping root', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog><input autofocus><button autofocus>x</button></dialog>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<button autofocus>',
			message: 'The "autofocus" attribute must be unique in the document',
		}),
	]);
});

test('[no-duplicate-autofocus-invalid-004] a dialog with autofocus and an inner autofocus target share the dialog as their scoping root', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog autofocus><input autofocus></dialog>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<input autofocus>',
			message: 'The "autofocus" attribute must be unique in the document',
		}),
	]);
});
