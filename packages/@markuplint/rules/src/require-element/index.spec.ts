import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('static', () => {
	test('[require-element-001] specifies to global rule', async () => {
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

	test('[require-element-002] specifies to node rule', async () => {
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
	test('[require-element-003] specifies to global rule', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{variable}</head></html>', {
			rule: ['meta[charset="UTF-8"]'],
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		});
		expect(violations.length).toBe(0);
	});

	test('[require-element-004] specifies to node rule: a head with dynamic content is not checked', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{variable}</head></html>', {
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

describe('React', () => {
	test('[require-element-005] native element', async () => {
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

	test('[require-element-006] custom element (Component)', async () => {
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
	test('[require-element-007] ignoreOmittedElements: true — ghost tbody does not satisfy the requirement', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><th>Heading</th><td>Text</td></tr></table>', {
			nodeRule: [
				{
					selector: 'table',
					rule: { value: ['tbody'], options: { ignoreOmittedElements: true } },
				},
			],
		});
		expect(violations.length).toBe(1);
		expect(violations[0]!.message).toBe('Require the "tbody" element');
	});

	test('[require-element-008] ignoreOmittedElements: true — explicit tbody satisfies the requirement', async () => {
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

	test('[require-element-009] ignoreOmittedElements: false — ghost tbody satisfies the requirement', async () => {
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

	test('[require-element-010] no option (default) — ghost tbody does not satisfy the requirement', async () => {
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

	test('[require-element-011] global rule: ghost tbody ignored with option', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><td>Text</td></tr></table>', {
			rule: { value: ['tbody'], options: { ignoreOmittedElements: true } },
		});
		expect(violations.length).toBe(1);
	});
});

describe('Pretenders Option', () => {
	test('[require-element-012] Outer', async () => {
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

	test('[require-element-013] Outer', async () => {
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
		).toStrictEqual([]);
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

	test('[require-element-014] The `as` attribute', async () => {
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

/**
 * A component that no pretender resolved renders something that is not known: it may render
 * the required element.
 */
describe('A component that no pretender resolved', () => {
	const jsx = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};
	const charset = 'meta[charset="UTF-8"]';

	test('[require-element-015] the only child of the element may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-016] ignoreHasMutableContents: false reports the missing element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: { value: [charset], options: { ignoreHasMutableContents: false } } }],
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

	test('[require-element-017] a component that a pretender resolved is the element that it renders', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			pretenders: [{ selector: 'Meta', as: 'meta' }],
			nodeRule: [{ selector: 'head', rule: [charset] }],
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

	test('[require-element-018] an expression in a descendant is not a child of the element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><noscript>{css}</noscript></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
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

	test('[require-element-019] a component in a descendant is not a child of the element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><noscript><Css /></noscript></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
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

	test('[require-element-020] a global rule: a component may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			rule: [charset],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-021] a global rule: ignoreHasMutableContents: false reports the missing element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			rule: { value: [charset], options: { ignoreHasMutableContents: false } },
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

	test('[require-element-022] a global rule: an expression somewhere is skipped only when the option is true', async () => {
		const code = '<html><head></head><body>{content}</body></html>';
		expect((await mlRuleTest(rule, code, { ...jsx, rule: [charset] })).violations).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(rule, code, {
					...jsx,
					rule: { value: [charset], options: { ignoreHasMutableContents: false } },
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<',
				message: 'Require the "meta[charset="UTF-8"]" element',
			},
		]);
	});

	test('[require-element-023] an expression that is a child may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{meta}</head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-024] a slot may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><slot /></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-025] a global rule: a component anywhere may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body><div><Meta /></div></body></html>', {
			...jsx,
			rule: [charset],
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('an expression or a branch that may render the required element', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	test('[require-element-026] an expression in a branch of a conditional block may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<main>{#if a}{content}{/if}</main>', {
			...svelte,
			rule: ['h1'],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-027] a branch that renders only static content leaves the required element missing', async () => {
		const { violations } = await mlRuleTest(rule, '<main>{#if a}<p>a</p>{/if}</main>', {
			...svelte,
			rule: ['h1'],
		});
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 1, raw: '<', message: 'Require the "h1" element' },
		]);
	});
});
