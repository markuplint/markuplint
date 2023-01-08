import { mlRuleTest } from 'markuplint';

import rule from './';

test('No space', async () => {
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

test('White space', async () => {
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

test('Has content', async () => {
	expect((await mlRuleTest(rule, '<div>\n\ttext\n\n</div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div><img /></div>')).violations).toStrictEqual([]);
});

test('Has content', async () => {
	expect((await mlRuleTest(rule, '<div>\n\ttext\n\n</div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div><img /></div>')).violations).toStrictEqual([]);
});

test('Element exception', async () => {
	expect((await mlRuleTest(rule, '<textarea></textarea>')).violations).toStrictEqual([]);
});

test('Ignore aria-busy', async () => {
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
	test('#593', async () => {
		expect((await mlRuleTest(rule, '<iframe></iframe>')).violations).toStrictEqual([]);
	});
});
