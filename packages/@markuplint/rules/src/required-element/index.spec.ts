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

describe('React', () => {
	it('native element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><title>Title</title></head></html>', {
			nodeRule: [
				{
					selector: 'head',
					rule: ['meta[charset="UTF-8"]'],
				},
			],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
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

	it('custom element (Component)', async () => {
		const { violations } = await mlRuleTest(rule, '<><Head><title>Title</title></Head></>', {
			nodeRule: [
				{
					selector: 'head',
					rule: ['meta[charset="UTF-8"]'],
				},
			],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Pretenders Option', () => {
	it('Outer', async () => {
		const { violations } = await mlRuleTest(rule, '<html><Head><title>Title</title></Head></html>', {
			nodeRule: [
				{
					selector: 'head',
					rule: ['meta[charset="UTF-8"]'],
				},
			],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			pretenders: [
				{
					selector: 'Head',
					as: 'head',
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<Head>',
				message: 'Require the "meta[charset="UTF-8"]" element',
			},
		]);
	});

	it('Outer', async () => {
		expect(
			(
				await mlRuleTest(rule, '<html><head><title>Title</title><Charset /></head></html>', {
					nodeRule: [
						{
							selector: 'head',
							rule: ['meta[charset="UTF-8"]'],
						},
					],
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Require the "meta[charset="UTF-8"]" element',
				raw: '<head>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<html><head><title>Title</title><Charset /></head></html>', {
					nodeRule: [
						{
							selector: 'head',
							rule: ['meta[charset="UTF-8"]'],
						},
					],
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Charset',
							as: {
								element: 'meta',
								attrs: [
									{
										name: 'charset',
										value: 'UTF-8',
									},
								],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});
});
