import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('Pretender slot content (issue #4054)', () => {
	const jsxRuleOn = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('[permitted-contents-issue-4054-001] static-only content with slots: null satisfies the required child', async () => {
		const { violations } = await mlRuleTest(rule, '<Picture />', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Picture',
					as: {
						element: 'picture',
						slots: null,
						contents: [
							{
								element: 'img',
								attrs: [
									{ name: 'src', value: 'a.gif' },
									{ name: 'alt', value: 'Example' },
								],
							},
						],
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-002] children given to a component with slots: null are still reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Picture><div></div></Picture>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Picture',
					as: {
						element: 'picture',
						slots: null,
						contents: [{ element: 'img', attrs: [{ name: 'src', value: 'a.gif' }] }],
					},
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				raw: '<div>',
				message: 'The "div" element is not allowed in the "picture" element in this context',
			},
		]);
	});

	const pic = {
		selector: 'Pic',
		as: {
			element: 'picture',
			slots: true as const,
			contents: [{ slot: true as const }, { element: 'img', attrs: [{ name: 'src', value: 'a.gif' }] }],
		},
	};

	test('[permitted-contents-issue-4054-003] static content after the slot completes what the given children lack', async () => {
		const { violations } = await mlRuleTest(rule, '<Pic><source srcSet="a.webp" /></Pic>', {
			...jsxRuleOn,
			pretenders: [pic],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-004] an element given at the slot that duplicates static content is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<Pic><img src="b.gif" /></Pic>', {
			...jsxRuleOn,
			pretenders: [pic],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<Pic>',
				message: 'The "img" element is not allowed in the "picture" element in this context',
			},
		]);
	});

	const details = {
		selector: 'Details',
		as: { element: 'details', slots: true as const, contents: [{ slot: true as const }] },
	};

	test('[permitted-contents-issue-4054-005] a missing required child is still reported when the slot is the whole content', async () => {
		const { violations } = await mlRuleTest(rule, '<Details></Details>', {
			...jsxRuleOn,
			pretenders: [details],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<Details>',
				message: 'Require an element. (Need "summary")',
			},
		]);
	});

	test('[permitted-contents-issue-4054-006] a required child given at the slot is accepted', async () => {
		const { violations } = await mlRuleTest(rule, '<Details><summary>t</summary></Details>', {
			...jsxRuleOn,
			pretenders: [details],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-007] a required child rendered by the component itself is accepted', async () => {
		const { violations } = await mlRuleTest(rule, '<Details></Details>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Details',
					as: {
						element: 'details',
						slots: true,
						contents: [{ element: 'summary' }, { slot: true }],
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-008] a dynamic entry in contents skips the missing-child report', async () => {
		const { violations } = await mlRuleTest(rule, '<Details></Details>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Details',
					as: {
						element: 'details',
						slots: true,
						contents: [{ dynamic: true }, { slot: true }],
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	const card = {
		selector: 'Card',
		as: {
			element: 'div',
			slots: [{ element: 'p', contents: [{ slot: true as const }] }],
		},
	};

	test('[permitted-contents-issue-4054-009] given children are evaluated against the slot wrapper, not the outer element', async () => {
		const { violations } = await mlRuleTest(rule, '<Card><div></div></Card>', {
			...jsxRuleOn,
			pretenders: [card],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<div>',
				message: 'The "div" element is not allowed in the "p" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4054-010] children allowed by the slot wrapper are accepted', async () => {
		const { violations } = await mlRuleTest(rule, '<Card><span>x</span></Card>', {
			...jsxRuleOn,
			pretenders: [card],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-011] the outer element still governs the component as a child', async () => {
		const { violations } = await mlRuleTest(rule, '<ul><Card></Card></ul>', {
			...jsxRuleOn,
			pretenders: [card],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				raw: '<Card>',
				message: 'The "div" element is not allowed in the "ul" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4054-012] children are not validated when several slot wrappers exist', async () => {
		const { violations } = await mlRuleTest(rule, '<Card><div></div></Card>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Card',
					as: {
						element: 'div',
						slots: [
							{ element: 'p', contents: [{ slot: true }] },
							{ element: 'ul', contents: [{ slot: true }] },
						],
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-013] the attrs of a slot wrapper select its conditional content model (colgroup[span] is empty)', async () => {
		const { violations } = await mlRuleTest(rule, '<Cols><div></div></Cols>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Cols',
					as: {
						element: 'div',
						slots: [
							{ element: 'colgroup', attrs: [{ name: 'span', value: '2' }], contents: [{ slot: true }] },
						],
					},
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<Cols>',
				message: 'The element disallows contents',
			},
		]);
	});

	test('[permitted-contents-issue-4054-014] a fragment pretender contributes its contents to the parent', async () => {
		const fragment = {
			selector: 'Field',
			as: {
				element: '#fragment',
				slots: null,
				contents: [{ element: 'li' }],
			},
		};
		const { violations: valid } = await mlRuleTest(rule, '<ul><Field /></ul>', {
			...jsxRuleOn,
			pretenders: [fragment],
		});
		expect(valid).toStrictEqual([]);

		const { violations: invalid } = await mlRuleTest(rule, '<span><Field /></span>', {
			...jsxRuleOn,
			pretenders: [fragment],
		});
		expect(invalid).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<Field />',
				message: 'The "li" element is not allowed in the "span" element in this context',
			},
		]);
	});
});

describe('Pretender slot content: review follow-ups (issue #4054)', () => {
	const jsxRuleOn = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('[permitted-contents-issue-4054-015] svg, math and custom elements the component renders are allowed where they are in the markup', async () => {
		const { violations } = await mlRuleTest(rule, '<IconButton>Label</IconButton>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'IconButton',
					as: {
						element: 'button',
						slots: true,
						contents: [{ element: 'svg' }, { element: 'my-icon' }, { slot: true }],
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4054-016] an unknown content in a fragment stands in the parent too', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><Sources /></picture>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Sources',
					as: {
						element: '#fragment',
						slots: null,
						contents: [
							{ element: 'source', attrs: [{ name: 'srcSet', value: 'a.webp' }] },
							{ dynamic: true },
						],
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Pretender slot content: parent-side evaluation (issue #4054)', () => {
	const jsxRuleOn = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('[permitted-contents-issue-4054-017] a transparent component whose children sit in an inner wrapper is not looked through', async () => {
		// Looked through as `a`, the `div` would be reported as disallowed by the `p` around it.
		// Only the wrapper (`span`) decides what the given children may be.
		const { violations } = await mlRuleTest(rule, '<p><Link><div></div></Link></p>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Link',
					as: { element: 'a', slots: [{ element: 'span', contents: [{ slot: true }] }] },
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				raw: '<div>',
				message: 'The "div" element is not allowed in the "span" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4054-018] static content of a transparent component is looked through and reported on the component', async () => {
		const { violations } = await mlRuleTest(rule, '<p><Link></Link></p>', {
			...jsxRuleOn,
			pretenders: [
				{
					selector: 'Link',
					as: { element: 'a', slots: true, contents: [{ element: 'div' }, { slot: true }] },
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				raw: '<Link>',
				message:
					'The "div" element is not allowed in the "p" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4054-019] the static content applies when the conditional child nodes are evaluated', async () => {
		const options = { evaluateConditionalChildNodes: true };
		const pretenders = [
			{
				selector: 'Details',
				as: { element: 'details', slots: true, contents: [{ element: 'summary' }, { slot: true }] },
			},
		] as const;

		const { violations: satisfied } = await mlRuleTest(
			rule,
			'<Details></Details>',
			{ ...jsxRuleOn, pretenders },
			{ options },
		);
		expect(satisfied).toStrictEqual([]);

		const { violations: duplicated } = await mlRuleTest(
			rule,
			'<Details><summary></summary></Details>',
			{ ...jsxRuleOn, pretenders },
			{ options },
		);
		expect(duplicated).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				raw: '<summary>',
				message: 'The "summary" element is not allowed in the "details" element in this context',
			},
		]);
	});
});
