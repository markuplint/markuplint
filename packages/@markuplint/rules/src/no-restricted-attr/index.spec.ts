import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-restricted-attr-valid-001] Add disallow attr', async () => {
	expect((await mlRuleTest(rule, '<x-div x-attr></x-div>')).violations).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr></x-div>', {
				rule: {
					options: {
						disallowAttrs: ['x-attr'],
					},
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "x-attr" attribute is disallowed',
			raw: 'x-attr',
		},
	]);
});

test('[no-restricted-attr-invalid-001] Add disallow attr', async () => {
	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="a"></x-div>', {
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'x-attr',
								value: { enum: ['b'] },
							},
						],
					},
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="b"></x-div>', {
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'x-attr',
								value: { enum: ['a', 'b', 'c'] },
							},
						],
					},
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "x-attr" attribute is disallowed to accept the following values: "a", "b", "c"',
			raw: 'b',
		},
	]);
});

test('[no-restricted-attr-invalid-002] Add disallow attr', async () => {
	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="a"></x-div>', {
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'x-attr',
								value: { pattern: '/^a{2,}$/' },
							},
						],
					},
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="aa"></x-div>', {
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'x-attr',
								value: { pattern: '/^a{2,}$/' },
							},
						],
					},
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "x-attr" attribute is matched with the below disallowed patterns: /^a{2,}$/',
			raw: 'aa',
		},
	]);
});

test('[no-restricted-attr-invalid-003] Add disallow attr', async () => {
	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="a"></x-div>', {
				rule: {
					options: {
						disallowAttrs: {
							'x-attr': { pattern: '/^a{2,}$/' },
						},
					},
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="aa"></x-div>', {
				rule: {
					options: {
						disallowAttrs: {
							'x-attr': { pattern: '/^a{2,}$/' },
						},
					},
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "x-attr" attribute is matched with the below disallowed patterns: /^a{2,}$/',
			raw: 'aa',
		},
	]);
});

test('[no-restricted-attr-invalid-004] Add disallow attr', async () => {
	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="1.1"></x-div>', {
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'x-attr',
								value: 'Int',
							},
						],
					},
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<x-div x-attr="1"></x-div>', {
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'x-attr',
								value: 'Int',
							},
						],
					},
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The type of the "x-attr" attribute is disallowed',
			raw: '1',
		},
	]);
});

test('[no-restricted-attr-invalid-005] custom rule: disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<a onclick="fn()"></>', {
		rule: {
			options: {
				disallowAttrs: ['onclick'],
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "onclick" attribute is disallowed',
			raw: 'onclick',
		},
	]);
});

describe('Disallow user-scalable=no in viewport meta (#716)', () => {
	const viewportConfig = {
		nodeRule: [
			{
				selector: "meta[name='viewport' i]",
				rule: {
					options: {
						disallowAttrs: [
							{
								name: 'content',
								value: {
									pattern: '/user-scalable\\s*=\\s*(no|0)\\b/i',
								},
							},
						],
					},
				},
			},
		],
	};

	const expectedMessage =
		'The "content" attribute is matched with the below disallowed patterns: /user-scalable\\s*=\\s*(no|0)\\b/i';

	test('[no-restricted-attr-issue-716-001] violation: user-scalable=no', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message: expectedMessage,
				raw: 'width=device-width, initial-scale=1, user-scalable=no',
			},
		]);
	});

	test('[no-restricted-attr-issue-716-002] violation: user-scalable=0', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable=0">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message: expectedMessage,
				raw: 'width=device-width, user-scalable=0',
			},
		]);
	});

	test('[no-restricted-attr-issue-716-003] violation: user-scalable=NO (case insensitive)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable=NO">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message: expectedMessage,
				raw: 'width=device-width, user-scalable=NO',
			},
		]);
	});

	test('[no-restricted-attr-issue-716-004] violation: spaces around = sign', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable = no">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message: expectedMessage,
				raw: 'width=device-width, user-scalable = no',
			},
		]);
	});

	test('[no-restricted-attr-issue-716-005] no violation: normal viewport', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, initial-scale=1">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-restricted-attr-issue-716-006] no violation: user-scalable=yes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable=yes">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-restricted-attr-issue-716-007] no violation: user-scalable=1', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable=1">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-restricted-attr-issue-716-008] no violation: non-viewport meta is not affected', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="description" content="user-scalable=no">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});
});
