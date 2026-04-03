import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('static', () => {
	test('[required-element-invalid-001] specifies to global rule', async () => {
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

	test('[required-element-invalid-002] specifies to node rule', async () => {
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
	test('[required-element-valid-001] specifies to global rule', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{variable}</head></html>', {
			rule: ['meta[charset="UTF-8"]'],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		});
		expect(violations.length).toBe(0);
	});

	test('[required-element-valid-002] specifies to node rule', async () => {
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
	test('[required-element-parser-001] native element', async () => {
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

	test('[required-element-parser-002] custom element (Component)', async () => {
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

describe('ghost/omitted elements', () => {
	test('[required-element-invalid-003] ignoreOmittedElements: true — ghost tbody does not satisfy the requirement', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><th>Heading</th><td>Text</td></tr></table>', {
			nodeRule: [
				{
					selector: 'table',
					rule: { value: ['tbody'], options: { ignoreOmittedElements: true } },
				},
			],
		});
		expect(violations.length).toBe(1);
		expect(violations[0].message).toBe('Require the "tbody" element');
	});

	test('[required-element-valid-003] ignoreOmittedElements: true — explicit tbody satisfies the requirement', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table><tbody><tr><th>Heading</th><td>Text</td></tr></tbody></table>',
			{
				nodeRule: [
					{
						selector: 'table',
						rule: { value: ['tbody'], options: { ignoreOmittedElements: true } },
					},
				],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[required-element-valid-004] ignoreOmittedElements: false — ghost tbody satisfies the requirement', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><th>Heading</th><td>Text</td></tr></table>', {
			nodeRule: [
				{
					selector: 'table',
					rule: { value: ['tbody'], options: { ignoreOmittedElements: false } },
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[required-element-invalid-004] no option (default) — ghost tbody does not satisfy the requirement', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><th>Heading</th><td>Text</td></tr></table>', {
			nodeRule: [
				{
					selector: 'table',
					rule: ['tbody'],
				},
			],
		});
		expect(violations.length).toBe(1);
	});

	test('[required-element-invalid-005] global rule: ghost tbody ignored with option', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><td>Text</td></tr></table>', {
			rule: { value: ['tbody'], options: { ignoreOmittedElements: true } },
		});
		expect(violations.length).toBe(1);
	});
});

describe('Pretenders Option', () => {
	test('[required-element-invalid-006] Outer', async () => {
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

	test('[required-element-invalid-007] Outer', async () => {
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

	test('[required-element-invalid-008] The `as` attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<x-div as="div"><span>Text</span></x-div>', {
			nodeRule: [
				{
					selector: 'div',
					rule: ['a'],
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "a" element',
				raw: '<x-div as="div">',
			},
		]);
	});
});
