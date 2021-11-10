import { mlTest } from 'markuplint';

import rule from './';

describe("Use the role that doesn't exist in the spec", () => {
	test('[role=hoge]', async () => {
		const { violations } = await mlTest(
			'<div role="hoge"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 6,
				message:
					'The "hoge" role does not exist according to the WAI-ARIA specificationThis "hoge" role does not exist in WAI-ARIA.',
				raw: 'role="hoge"',
			},
		]);
	});
});

describe('Use the abstract role', () => {
	test('[role=roletype]', async () => {
		const { violations } = await mlTest(
			'<div role="roletype"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "roletype" role is the abstract role',
				raw: 'role="roletype"',
			},
		]);
	});
});

describe("Use the property/state that doesn't belong to a set role (or an implicit role)", () => {
	test('[aria-checked=true]', async () => {
		const { violations } = await mlTest(
			'<div aria-checked="true"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "aria-checked" ARIA state/property is not global state/property',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-checked=true]', async () => {
		const { violations } = await mlTest(
			'<button aria-checked="true"></button>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "aria-checked" ARIA state/property is disallowed on the "button" role',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-pressed=true]', async () => {
		const { violations } = await mlTest(
			'<button aria-pressed="true"></button>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations.length).toBe(0);
	});
});

describe('Use an invalid value of the property/state', () => {
	test('[aria-current=foo]', async () => {
		const { violations } = await mlTest(
			'<div aria-current="foo"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 6,
				message:
					'The "foo" is disallowed on the "aria-current" ARIA state/property. Arrowed values are: "page", "step", "location", "date", "time", "true", "false"',
				raw: 'aria-current="foo"',
			},
		]);
	});

	test('[aria-current=page]', async () => {
		const { violations } = await mlTest(
			'<div aria-current="page"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations.length).toBe(0);
	});

	test('disabled', async () => {
		const { violations } = await mlTest(
			'<div aria-current="foo"></div>',
			{
				rules: {
					'wai-aria': {
						option: {
							checkingValue: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(violations.length).toBe(0);
	});
});

describe('Use the not permitted role according to ARIA in HTML', () => {
	test('script[role=link]', async () => {
		const { violations } = await mlTest(
			'<script role="link"></script>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 9,
				message: 'Cannot overwrite the role of the "script" element according to ARIA in HTML specification',
				raw: 'role="link"',
			},
		]);
	});

	test('a[role=document]', async () => {
		const { violations } = await mlTest(
			'<a href role="document"></a>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 9,
				message:
					'Cannot overwrite the "document" role to the "a" element according to ARIA in HTML specification',
				raw: 'role="document"',
			},
		]);
	});

	test('disabled', async () => {
		const { violations } = await mlTest(
			'<script role="link"></script>',
			{
				rules: {
					'wai-aria': {
						option: {
							permittedAriaRoles: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(violations.length).toBe(0);
	});
});

describe("Don't set the required property/state", () => {
	test('heading needs aria-level', async () => {
		const { violations } = await mlTest(
			'<div role="heading"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "aria-level" ARIA state/property on the "heading" role',
				raw: '<div role="heading">',
			},
		]);
	});

	test("h1 element doesn't needs aria-level", async () => {
		const { violations } = await mlTest(
			'<h1></h1>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([]);
	});
});

describe('Set the implicit role explicitly', () => {
	test('a[href][role=link]', async () => {
		const { violations } = await mlTest(
			'<a href="path/to" role="link"></a>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 19,
				message: 'The "link" role is the implicit role of the "a" element',
				raw: 'role="link"',
			},
		]);
	});

	test('header[role=banner]', async () => {
		const { violations } = await mlTest(
			'<header role="banner"></header>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "banner" role is the implicit role of the "header" element',
				raw: 'role="banner"',
			},
		]);

		const { violations: violations2 } = await mlTest(
			'<header role="banner"><article></article></header>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations2).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 9,
				message:
					'Cannot overwrite the "banner" role to the "header" element according to ARIA in HTML specification',
				raw: 'role="banner"',
			},
		]);
	});

	test('disabled', async () => {
		const { violations } = await mlTest(
			'<a href="path/to" role="link"></a>',
			{
				rules: {
					'wai-aria': {
						option: {
							disallowSetImplicitRole: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(violations.length).toBe(0);
	});
});

describe('Set the default value of the property/state explicitly', () => {
	test('aria-live="off"', async () => {
		const { violations } = await mlTest(
			'<div aria-live="off"></div>',
			{
				rules: {
					'wai-aria': {
						option: {
							disallowDefaultValue: true,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 6,
				message: 'It is default value',
				raw: 'aria-live="off"',
			},
		]);
	});
});

describe('Set the deprecated property/state', () => {
	test('aria-disabled is deprecated in article', async () => {
		const { violations } = await mlTest(
			'<article aria-disabled="true"></article>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "aria-disabled" ARIA state/property is deprecated on the "article" role',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	test('aria-disabled is deprecated in article role', async () => {
		const { violations } = await mlTest(
			'<div role="article" aria-disabled="true"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 21,
				message: 'The "aria-disabled" ARIA state/property is deprecated on the "article" role',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	test('disable', async () => {
		const { violations } = await mlTest(
			'<article aria-disabled="true"></article>',
			{
				rules: {
					'wai-aria': {
						option: {
							checkingDeprecatedProps: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([]);
	});
});

describe('Set the property/state explicitly when its element has semantic HTML attribute equivalent to it according to ARIA in HTML.', () => {
	test('checked and aria-checked="true"', async () => {
		const { violations } = await mlTest(
			'<input type="checkbox" checked aria-checked="true" />',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-checked" ARIA state/property has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('checked and aria-checked="false"', async () => {
		const { violations } = await mlTest(
			'<input type="checkbox" checked aria-checked="false" />',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 32,
				message: 'The "aria-checked" ARIA state/property contradicts the current "checked" attribute',
				raw: 'aria-checked="false"',
			},
		]);
	});

	test('only aria-checked="true"', async () => {
		const { violations } = await mlTest(
			'<input type="checkbox" aria-checked="true" />',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 24,
				message: 'The "aria-checked" ARIA state/property contradicts the implicit "checked" attribute',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('check and aria-checked="mixed"', async () => {
		const { violations } = await mlTest(
			'<input type="checkbox" checked aria-checked="mixed" />',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([]);
	});

	test('placeholder="type hints" and aria-placeholder="type hints"', async () => {
		const { violations } = await mlTest(
			'<input type="text" placeholder="type hints" aria-placeholder="type hints" />',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 45,
				message:
					'The "aria-placeholder" ARIA state/property has the same semantics as the current "placeholder" attribute or the implicit "placeholder" attribute',
				raw: 'aria-placeholder="type hints"',
			},
		]);
	});

	test('placeholder="type hints" and aria-placeholder="different value"', async () => {
		const { violations } = await mlTest(
			'<input type="text" placeholder="type hints" aria-placeholder="different value" />',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 45,
				message: 'The "aria-placeholder" ARIA state/property contradicts the current "placeholder" attribute',
				raw: 'aria-placeholder="different value"',
			},
		]);
	});

	test('hidden vs aria-hidden', async () => {
		const config = {
			rules: {
				'wai-aria': true,
			},
		};

		const { violations: violations1 } = await mlTest('<div hidden></div>', config, [rule], 'en');
		const { violations: violations2 } = await mlTest('<div hidden aria-hidden="true"></div>', config, [rule], 'en');
		const { violations: violations3 } = await mlTest(
			'<div hidden aria-hidden="false"></div>',
			config,
			[rule],
			'en',
		);
		const { violations: violations4 } = await mlTest('<div aria-hidden="true"></div>', config, [rule], 'en');
		const { violations: violations5 } = await mlTest('<div aria-hidden="false"></div>', config, [rule], 'en');

		expect(violations1[0]?.message).toBe(undefined);
		expect(violations2[0]?.message).toBe(
			'The "aria-hidden" ARIA state/property has the same semantics as the current "hidden" attribute or the implicit "hidden" attribute',
		);
		expect(violations3[0]?.message).toBe(
			'The "aria-hidden" ARIA state/property contradicts the current "hidden" attribute',
		);
		expect(violations4[0]?.message).toBe(undefined);
		expect(violations5[0]?.message).toBe(undefined);
	});

	test('disable', async () => {
		const { violations } = await mlTest(
			'<input type="checkbox" checked aria-checked="true" />',
			{
				rules: {
					'wai-aria': {
						option: {
							disallowSetImplicitProps: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(violations).toStrictEqual([]);
	});
});

describe('childNodeRules', () => {
	test('ex. For Safari + VoiceOver', async () => {
		const { violations } = await mlTest(
			'<img src="path/to.svg" alt="text" role="img" />',
			{
				rules: {
					'wai-aria': true,
				},
				nodeRules: [
					{
						selector: 'img[src$=.svg]',
						rules: {
							'wai-aria': {
								option: {
									disallowSetImplicitRole: false,
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);

		expect(violations.length).toBe(0);
	});
});
