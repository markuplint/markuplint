import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-empty-palpable-content-valid-001] No space', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<div>',
		},
	]);
	expect((await mlRuleTest(rule, '<p></p>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<p>',
		},
	]);
	expect((await mlRuleTest(rule, '<span></span>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<span>',
		},
	]);
	expect((await mlRuleTest(rule, '<li></li>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<li>',
		},
	]);
	expect((await mlRuleTest(rule, '<svg><rect /></svg>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-invalid-001] White space', async () => {
	expect((await mlRuleTest(rule, '<div> </div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<div>',
		},
	]);
	expect((await mlRuleTest(rule, '<div>\n\t   \n\n</div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<div>',
		},
	]);
});

test('[no-empty-palpable-content-valid-002] Has content', async () => {
	expect((await mlRuleTest(rule, '<div>\n\ttext\n\n</div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div><img /></div>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-valid-003] Has content', async () => {
	expect((await mlRuleTest(rule, '<div>\n\ttext\n\n</div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div><img /></div>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-valid-004] Element exception', async () => {
	expect((await mlRuleTest(rule, '<textarea></textarea>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-valid-005] Ignore aria-busy', async () => {
	expect((await mlRuleTest(rule, '<div aria-busy="true"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div aria-busy="true">\n\t\n\n</div>')).violations).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<div aria-busy="true">\n\t\n\n</div>', {
				rule: {
					options: {
						ignoreIfAriaBusy: false,
					},
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<div aria-busy="true">',
		},
	]);
});

describe('Issues', () => {
	test('[no-empty-palpable-content-issue-593] #593', async () => {
		expect((await mlRuleTest(rule, '<iframe></iframe>')).violations).toStrictEqual([]);
	});

	test('[no-empty-palpable-content-issue-775] #775', async () => {
		expect((await mlRuleTest(rule, '<pre>text</pre>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<pre>\n\ttext</pre>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<pre>text\ntext</pre>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<pre>\ntext</pre>')).violations).toStrictEqual([]);
	});

	test('[no-empty-palpable-content-issue-1948] #1948', async () => {
		expect((await mlRuleTest(rule, '<audio></audio>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<canvas></canvas>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<video></video>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<textarea></textarea>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<output></output>')).violations).toStrictEqual([]);
	});
});
