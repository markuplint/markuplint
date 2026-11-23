import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-autofocus-001] single autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<div><input autofocus><input></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-002] no autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<div><input><input></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-003] two autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<div><input autofocus><input autofocus></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			raw: '<input autofocus>',
			line: 1,
			col: 23,
			message: 'The "autofocus" attribute must be unique in the document',
		},
	]);
});

test('[no-duplicate-autofocus-004] three autofocus', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><input autofocus><button autofocus>x</button><textarea autofocus></textarea></div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			raw: '<button autofocus>',
			line: 1,
			col: 23,
			message: 'The "autofocus" attribute must be unique in the document',
		},
		{
			severity: 'error',
			raw: '<textarea autofocus>',
			line: 1,
			col: 51,
			message: 'The "autofocus" attribute must be unique in the document',
		},
	]);
});

test('[no-duplicate-autofocus-005] each dialog has its own autofocus scoping root', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<dialog><input autofocus></dialog><dialog><button autofocus>x</button></dialog>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-006] each popover has its own autofocus scoping root', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div popover><input autofocus></div><div popover><button autofocus>x</button></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-007] a dialog-scoped autofocus does not conflict with a document-level autofocus', async () => {
	const { violations } = await mlRuleTest(rule, '<input autofocus><dialog><button autofocus>x</button></dialog>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-autofocus-008] two autofocus elements sharing the same dialog scoping root', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog><input autofocus><button autofocus>x</button></dialog>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			raw: '<button autofocus>',
			line: 1,
			col: 26,
			message: 'The "autofocus" attribute must be unique in the document',
		},
	]);
});

test('[no-duplicate-autofocus-009] a dialog with autofocus and an inner autofocus target share the dialog as their scoping root', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog autofocus><input autofocus></dialog>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			raw: '<input autofocus>',
			line: 1,
			col: 19,
			message: 'The "autofocus" attribute must be unique in the document',
		},
	]);
});

test('[no-duplicate-autofocus-010] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<input autofocus><input autofocus>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 18,
			message: '「autofocus」属性は文書内で一意であるべきです',
			raw: '<input autofocus>',
		},
	]);
});
