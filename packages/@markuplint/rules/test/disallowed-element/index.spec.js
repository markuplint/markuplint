const { mlRuleTest } = require('markuplint');

const rule = require('../../lib/disallowed-element').default;

it('specifies to global rule', async () => {
	const { violations } = await mlRuleTest(rule, '<div><hgroup><h1>Heading</h1></hgroup></div>', {
		rule: ['hgroup'],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: '<hgroup>',
			message: 'The "hgroup" element is disallowed',
		},
	]);
});

it('specifies to node rule', async () => {
	const { violations } = await mlRuleTest(rule, '<h1><span>Title</span><small>Sub-title</small></h1>', {
		nodeRule: [
			{
				selector: 'h1, h2, h3, h4, h5, h6',
				rule: ['small'],
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			raw: '<small>',
			message: 'The "small" element is disallowed',
		},
	]);
});

it('Recommend', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>',
				{
					nodeRule: [
						{
							selector: 'summary',
							rule: ['label'],
						},
					],
				},
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			raw: '<label id="foo">',
			message: 'The "label" element is disallowed',
		},
	]);

	expect(
		(
			await mlRuleTest(
				rule,
				'<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>',
				{
					nodeRule: [
						{
							selector: 'summary',
							rule: [':model(interactive)'],
						},
					],
				},
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			raw: '<label id="foo">',
			message: 'The ":model(interactive)" element is disallowed',
		},
	]);
});
