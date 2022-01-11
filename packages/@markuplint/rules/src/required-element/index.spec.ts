import { mlRuleTest } from 'markuplint';

import rule from '.';

describe('static', () => {
	it('specifies to global rule', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head></html>', {
			rule: ['meta[charset="UTF-8"]'],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<',
				message: 'Require the "meta[charset="UTF-8"]" element',
			},
		]);
	});

	it('specifies to node rule', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head></html>', {
			nodeRule: [
				{
					selector: 'head',
					rule: ['meta[charset="UTF-8"]'],
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<head>',
				message: 'Require the "meta[charset="UTF-8"]" element',
			},
		]);
	});
});

describe('dynamic', () => {
	it('specifies to global rule', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{variable}</head></html>', {
			rule: ['meta[charset="UTF-8"]'],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		});
		expect(violations.length).toBe(0);
	});

	it('specifies to node rule', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{variable}</head></html>', {
			rule: ['meta[charset="UTF-8"]'],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		});
		expect(violations.length).toBe(0);
	});
});
