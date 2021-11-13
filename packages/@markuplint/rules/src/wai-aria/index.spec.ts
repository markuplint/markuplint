import { mlRuleTest } from 'markuplint';

import rule from './';

describe("Use the role that doesn't exist in the spec", () => {
	test('[role=hoge]', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="hoge"></div>', { rule: true });

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<div role="roletype"></div>', { rule: true });

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<div aria-checked="true"></div>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "aria-checked" ARIA state/property is not global state/property',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-checked=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-checked="true"></button>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "aria-checked" ARIA state/property is disallowed on the "button" role',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-pressed=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-pressed="true"></button>', { rule: true });

		expect(violations.length).toBe(0);
	});
});

describe('Use an invalid value of the property/state', () => {
	test('[aria-current=foo]', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-current="foo"></div>', { rule: true });

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<div aria-current="page"></div>', { rule: true });

		expect(violations.length).toBe(0);
	});

	test('disabled', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-current="foo"></div>', {
			rule: {
				option: {
					checkingValue: false,
				},
			},
		});

		expect(violations.length).toBe(0);
	});
});

describe('Use the not permitted role according to ARIA in HTML', () => {
	test('script[role=link]', async () => {
		const { violations } = await mlRuleTest(rule, '<script role="link"></script>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'Cannot overwrite the role of the "script" element according to ARIA in HTML specification',
				raw: 'role="link"',
			},
		]);
	});

	test('a[role=document]', async () => {
		const { violations } = await mlRuleTest(rule, '<a href role="document"></a>', { rule: true });

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<script role="link"></script>', {
			rule: {
				option: {
					permittedAriaRoles: false,
				},
			},
		});

		expect(violations.length).toBe(0);
	});
});

describe("Don't set the required property/state", () => {
	test('heading needs aria-level', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="heading"></div>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "aria-level" ARIA state/property on the "heading" role',
				raw: '<div role="heading">',
			},
		]);
	});

	test("h1 element doesn't needs aria-level", async () => {
		const { violations } = await mlRuleTest(rule, '<h1></h1>', { rule: true });

		expect(violations).toStrictEqual([]);
	});
});

describe('Set the implicit role explicitly', () => {
	test('a[href][role=link]', async () => {
		const { violations } = await mlRuleTest(rule, '<a href="path/to" role="link"></a>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 19,
				message: 'The "link" role is the implicit role of the "a" element',
				raw: 'role="link"',
			},
		]);
	});

	test('header[role=banner]', async () => {
		const { violations } = await mlRuleTest(rule, '<header role="banner"></header>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "banner" role is the implicit role of the "header" element',
				raw: 'role="banner"',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			'<header role="banner"><article></article></header>',
			{ rule: true },
		);

		expect(violations2).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<a href="path/to" role="link"></a>', {
			rule: {
				option: {
					disallowSetImplicitRole: false,
				},
			},
		});

		expect(violations.length).toBe(0);
	});
});

describe('Set the default value of the property/state explicitly', () => {
	test('aria-live="off"', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-live="off"></div>', {
			rule: {
				option: {
					disallowDefaultValue: true,
				},
			},
		});

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<article aria-disabled="true"></article>', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "aria-disabled" ARIA state/property is deprecated on the "article" role',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	test('aria-disabled is deprecated in article role', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="article" aria-disabled="true"></div>', {
			rule: true,
		});

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				message: 'The "aria-disabled" ARIA state/property is deprecated on the "article" role',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	test('disable', async () => {
		const { violations } = await mlRuleTest(rule, '<article aria-disabled="true"></article>', {
			rule: {
				option: {
					checkingDeprecatedProps: false,
				},
			},
		});

		expect(violations).toStrictEqual([]);
	});
});

describe('Set the property/state explicitly when its element has semantic HTML attribute equivalent to it according to ARIA in HTML.', () => {
	test('checked and aria-checked="true"', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="true" />', {
			rule: true,
		});

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="false" />', {
			rule: true,
		});

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message: 'The "aria-checked" ARIA state/property contradicts the current "checked" attribute',
				raw: 'aria-checked="false"',
			},
		]);
	});

	test('only aria-checked="true"', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" />', { rule: true });

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 24,
				message: 'The "aria-checked" ARIA state/property contradicts the implicit "checked" attribute',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('check and aria-checked="mixed"', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="mixed" />', {
			rule: true,
		});

		expect(violations).toStrictEqual([]);
	});

	test('placeholder="type hints" and aria-placeholder="type hints"', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input type="text" placeholder="type hints" aria-placeholder="type hints" />',
			{ rule: true },
		);

		expect(violations).toStrictEqual([
			{
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
		const { violations } = await mlRuleTest(
			rule,
			'<input type="text" placeholder="type hints" aria-placeholder="different value" />',
			{ rule: true },
		);

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 45,
				message: 'The "aria-placeholder" ARIA state/property contradicts the current "placeholder" attribute',
				raw: 'aria-placeholder="different value"',
			},
		]);
	});

	test('hidden vs aria-hidden', async () => {
		const config = { rule: true };

		const { violations: violations1 } = await mlRuleTest(rule, '<div hidden></div>', config);
		const { violations: violations2 } = await mlRuleTest(rule, '<div hidden aria-hidden="true"></div>', config);
		const { violations: violations3 } = await mlRuleTest(rule, '<div hidden aria-hidden="false"></div>', config);
		const { violations: violations4 } = await mlRuleTest(rule, '<div aria-hidden="true"></div>', config);
		const { violations: violations5 } = await mlRuleTest(rule, '<div aria-hidden="false"></div>', config);

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
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="true" />', {
			rule: {
				option: {
					disallowSetImplicitProps: false,
				},
			},
		});

		expect(violations).toStrictEqual([]);
	});
});

describe('childNodeRules', () => {
	test('ex. For Safari + VoiceOver', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="path/to.svg" alt="text" role="img" />', {
			rule: true,
			nodeRule: [
				{
					selector: 'img[src$=.svg]',
					rule: {
						option: {
							disallowSetImplicitRole: false,
						},
					},
				},
			],
		});

		expect(violations.length).toBe(0);
	});
});
