import { mlRuleTest } from 'markuplint';

import rule from './';

describe("Use the role that doesn't exist in the spec", () => {
	test('[role=hoge]', async () => {
		expect((await mlRuleTest(rule, '<div role="hoge"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message:
					'The "hoge" role does not exist according to the WAI-ARIA specification. This "hoge" role does not exist in WAI-ARIA.',
				raw: 'hoge',
			},
		]);

		expect((await mlRuleTest(rule, '<div role="none hoge"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message:
					'The "hoge" role does not exist according to the WAI-ARIA specification. This "hoge" role does not exist in WAI-ARIA.',
				raw: 'hoge',
			},
		]);
	});

	test('Graphics ARIA to HTML', async () => {
		expect((await mlRuleTest(rule, '<div role="graphics-document"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message:
					'The "graphics-document" role does not exist according to the WAI-ARIA specification. This "graphics-document" role does not exist in WAI-ARIA.',
				raw: 'graphics-document',
			},
		]);

		expect((await mlRuleTest(rule, '<svg><rect role="graphics-document"></rect></svg>')).violations).toStrictEqual(
			[],
		);
	});
});

describe('Use the abstract role', () => {
	test('[role=roletype]', async () => {
		expect((await mlRuleTest(rule, '<div role="roletype"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'The "roletype" role is the abstract role',
				raw: 'roletype',
			},
		]);

		expect((await mlRuleTest(rule, '<div role="article roletype"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message: 'The "roletype" role is the abstract role',
				raw: 'roletype',
			},
		]);
	});
});

describe("Use the property/state that doesn't belong to a set role (or an implicit role)", () => {
	test('[aria-checked=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-checked="true"></div>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "aria-checked" ARIA state is disallowed on the "generic" role',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('[aria-checked=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-checked="true"></div>', {
			rule: {
				option: { version: '1.1' },
			},
		});

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "aria-checked" ARIA state is not global state',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-checked=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-checked="true"></button>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "aria-checked" ARIA state is disallowed on the "button" role',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-pressed=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-pressed="true"></button>');

		expect(violations.length).toBe(0);
	});
});

describe('Use an invalid value of the property/state', () => {
	test('[aria-current=foo]', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-current="foo"></div>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message:
					'The "foo" is disallowed on the "aria-current" ARIA state. Allowed values are: "page", "step", "location", "date", "time", "true", "false"',
				raw: 'aria-current="foo"',
			},
		]);
	});

	test('[aria-current=page]', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-current="page"></div>');

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
		const { violations } = await mlRuleTest(rule, '<script role="link"></script>');

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
		const { violations } = await mlRuleTest(rule, '<a href role="document"></a>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message:
					'Cannot overwrite the "document" role to the "a" element according to ARIA in HTML specification',
				raw: 'document',
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
		const { violations } = await mlRuleTest(rule, '<div role="heading"></div>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "aria-level" ARIA property on the "heading" role',
				raw: '<div role="heading">',
			},
		]);
	});

	test("h1 element doesn't needs aria-level", async () => {
		const { violations } = await mlRuleTest(rule, '<h1></h1>');

		expect(violations).toStrictEqual([]);
	});
});

describe('Set the implicit role explicitly', () => {
	test('a[href][role=link]', async () => {
		const { violations } = await mlRuleTest(rule, '<a href="path/to" role="link"></a>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'The "link" role is the implicit role of the "a" element',
				raw: 'link',
			},
		]);
	});

	test('header[role=banner]', async () => {
		const { violations } = await mlRuleTest(rule, '<header role="banner"></header>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message: 'The "banner" role is the implicit role of the "header" element',
				raw: 'banner',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			'<header role="banner"><article></article></header>',
		);

		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message:
					'Cannot overwrite the "banner" role to the "header" element according to ARIA in HTML specification',
				raw: 'banner',
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
		const { violations } = await mlRuleTest(rule, '<article aria-disabled="true"></article>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "aria-disabled" ARIA state is deprecated on the "article" role',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	test('aria-disabled is deprecated in article role', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="article" aria-disabled="true"></div>');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				message: 'The "aria-disabled" ARIA state is deprecated on the "article" role',
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
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="true" />');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-checked" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('checked and aria-checked="false"', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="false" />');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message: 'The "aria-checked" ARIA state contradicts the current "checked" attribute',
				raw: 'aria-checked="false"',
			},
		]);
	});

	test('only aria-checked="true"', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" />');

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 24,
				message: 'The "aria-checked" ARIA state contradicts the implicit "checked" attribute',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('check and aria-checked="mixed"', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="mixed" />');

		expect(violations).toStrictEqual([]);
	});

	test('placeholder="type hints" and aria-placeholder="type hints"', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input type="text" placeholder="type hints" aria-placeholder="type hints" />',
		);

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 45,
				message:
					'The "aria-placeholder" ARIA property has the same semantics as the current "placeholder" attribute or the implicit "placeholder" attribute',
				raw: 'aria-placeholder="type hints"',
			},
		]);
	});

	test('placeholder="type hints" and aria-placeholder="different value"', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input type="text" placeholder="type hints" aria-placeholder="different value" />',
		);

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 45,
				message: 'The "aria-placeholder" ARIA property contradicts the current "placeholder" attribute',
				raw: 'aria-placeholder="different value"',
			},
		]);
	});

	test('hidden vs aria-hidden', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<div hidden></div>');
		const { violations: violations2 } = await mlRuleTest(rule, '<div hidden aria-hidden="true"></div>');
		const { violations: violations3 } = await mlRuleTest(rule, '<div hidden aria-hidden="false"></div>');
		const { violations: violations4 } = await mlRuleTest(rule, '<div aria-hidden="true"></div>');
		const { violations: violations5 } = await mlRuleTest(rule, '<div aria-hidden="false"></div>');

		expect(violations1[0]?.message).toBe(undefined);
		expect(violations2[0]?.message).toBe(
			'The "aria-hidden" ARIA state has the same semantics as the current "hidden" attribute or the implicit "hidden" attribute',
		);
		expect(violations3[0]?.message).toBe('The "aria-hidden" ARIA state contradicts the current "hidden" attribute');
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

describe('Required Owned Elements', () => {
	test('Empty content', async () => {
		expect((await mlRuleTest(rule, '<div role="list"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "listitem" role to content. Or, require aria-busy="true"',
				raw: '<div role="list">',
			},
		]);

		expect((await mlRuleTest(rule, '<div role="list" aria-busy="true"></div>')).violations).toStrictEqual([]);
	});

	test('Empty content (Implicit role)', async () => {
		expect((await mlRuleTest(rule, '<ul></ul>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "listitem" role to content. Or, require aria-busy="true"',
				raw: '<ul>',
			},
		]);

		expect((await mlRuleTest(rule, '<ul aria-busy="true"></ul>')).violations).toStrictEqual([]);
	});

	test('Invalid contents', async () => {
		expect((await mlRuleTest(rule, '<table><tbody><tr><td></td></tr></tbody></table>')).violations).toStrictEqual(
			[],
		);
		expect((await mlRuleTest(rule, '<table><tr><td></td></tr></table>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<table><tbody></tbody></table>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "table" role expects the "row", "rowgroup > row" roles',
				raw: '<table>',
			},
			{
				severity: 'error',
				line: 1,
				col: 8,
				message: 'Require the "row" role to content. Or, require aria-busy="true"',
				raw: '<tbody>',
			},
		]);
	});
});

describe('childNodeRules', () => {
	test('ex. For Safari + VoiceOver', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="path/to.svg" alt="text" role="img" />', {
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

describe('Issues', () => {
	// https://github.com/markuplint/markuplint/issues/397
	// And https://github.com/markuplint/markuplint/issues/397#issuecomment-1148349418
	// And https://github.com/markuplint/markuplint/issues/397#issuecomment-1156728358
	test('#397', async () => {
		{
			const { violations } = await mlRuleTest(rule, '<table><tr><th aria-sort="ascending"></th></tr></table>');
			expect(violations).toStrictEqual([
				// https://github.com/markuplint/markuplint/issues/397#issuecomment-1156728358
				// The element role is not `cell`.
				// {
				// 	severity: 'error',
				// 	line: 1,
				// 	col: 16,
				// 	message: 'The "aria-sort" ARIA state/property is disallowed on the "cell" role',
				// 	raw: 'aria-sort="ascending"',
				// },
			]);
		}

		{
			const { violations } = await mlRuleTest(
				rule,
				'<table><tr><th scope="row" aria-sort="ascending"></th></tr></table>',
			);
			expect(violations).toStrictEqual([]);
		}
	});
});
