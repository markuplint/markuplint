import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

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

	test('[require-element-issue-4572-001] the only child of the element may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-issue-4572-002] ignoreHasMutableContents: false reports the missing element', async () => {
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

	test('[require-element-issue-4572-003] a component that a pretender resolved is the element that it renders', async () => {
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

	test('[require-element-issue-4572-004] an expression in a descendant is not a child of the element', async () => {
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

	test('[require-element-issue-4572-005] a component in a descendant is not a child of the element', async () => {
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

	test('[require-element-issue-4572-006] a global rule: a component may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><Meta /></head></html>', {
			...jsx,
			rule: [charset],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-issue-4572-007] a global rule: ignoreHasMutableContents: false reports the missing element', async () => {
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

	test('[require-element-issue-4572-008] a global rule: an expression somewhere is skipped only when the option is true', async () => {
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

	test('[require-element-issue-4572-009] an expression that is a child may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head>{meta}</head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-issue-4572-010] a slot may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><slot /></head></html>', {
			...jsx,
			nodeRule: [{ selector: 'head', rule: [charset] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[require-element-issue-4572-011] a global rule: a component anywhere may render the required element', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body><div><Meta /></div></body></html>', {
			...jsx,
			rule: [charset],
		});
		expect(violations).toStrictEqual([]);
	});
});
