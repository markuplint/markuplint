import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-empty-palpable-content-001] No space', async () => {
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

test('[no-empty-palpable-content-002] White space', async () => {
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

test('[no-empty-palpable-content-003] Has content', async () => {
	expect((await mlRuleTest(rule, '<div>\n\ttext\n\n</div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div><img /></div>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-004] Element exception', async () => {
	expect((await mlRuleTest(rule, '<textarea></textarea>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-005] Ignore aria-busy', async () => {
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

test('[no-empty-palpable-content-006] an iframe is not reported when it is empty', async () => {
	expect((await mlRuleTest(rule, '<iframe></iframe>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-007] a pre that has text is not empty, whether the text starts on a new line or not', async () => {
	expect((await mlRuleTest(rule, '<pre>text</pre>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<pre>\n\ttext</pre>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<pre>text\ntext</pre>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<pre>\ntext</pre>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-008] audio, canvas, video, textarea and output are not reported when they are empty', async () => {
	expect((await mlRuleTest(rule, '<audio></audio>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<canvas></canvas>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<video></video>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<textarea></textarea>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<output></output>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-009] only ASCII white space is empty: a text of U+00A0 is content', async () => {
	// ASCII white space is inter-element whitespace, which is not content
	expect((await mlRuleTest(rule, '<p> \t\n\f\r </p>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<p>',
		},
	]);
	expect((await mlRuleTest(rule, '<p>\u00A0</p>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<p>\u2003</p>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<p>&nbsp;</p>')).violations).toStrictEqual([]);
});

test('[no-empty-palpable-content-010] a reference to U+0020 only is white space, which is empty', async () => {
	const { violations } = await mlRuleTest(rule, '<p>&#32;</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'The element should not empty',
			raw: '<p>',
		},
	]);
});
