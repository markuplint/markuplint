import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

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
				options: { version: '1.1' },
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
				options: {
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
				options: {
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
				options: {
					disallowSetImplicitRole: false,
				},
			},
		});

		expect(violations.length).toBe(0);
	});

	test('The `as` attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<x-link as="a" href="path/to" role="link"></x-link>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 37,
				message: 'The "link" role is the implicit role of the "a" element',
				raw: 'link',
			},
		]);
	});
});

describe('Set the default value of the property/state explicitly', () => {
	test('aria-live="off"', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-live="off"></div>', {
			rule: {
				options: {
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
				options: {
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
					'The "aria-checked" ARIA state must not use on the "input" element. As its state is already provided by the "checked" attribute',
				raw: 'aria-checked="true"',
			},
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
				message:
					'The "aria-checked" ARIA state must not use on the "input" element. As its state is already provided by the "checked" attribute',
				raw: 'aria-checked="false"',
			},
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
				message:
					'The "aria-checked" ARIA state must not use on the "input" element. Add the "checked" attribute if you use the ARIA state',
				raw: 'aria-checked="true"',
			},
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

		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-checked" ARIA state must not use on the "input" element. As its state is already provided by the "checked" attribute',
				raw: 'aria-checked="mixed"',
			},
		]);
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
				options: {
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
				message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
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
				message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
				raw: '<ul>',
			},
		]);

		expect((await mlRuleTest(rule, '<ul>   </ul>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
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
				message: 'The "table" role expects the roles: "row", "rowgroup > row"',
				raw: '<table>',
			},
			{
				severity: 'error',
				line: 1,
				col: 8,
				message: 'The child element requires the "row" role. Or, require aria-busy="true"',
				raw: '<tbody>',
			},
		]);
	});

	test('Invalid contents', async () => {
		expect((await mlRuleTest(rule, '<ul><div></div></ul>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
	});

	test('Valid contents', async () => {
		const jsx = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		};
		expect((await mlRuleTest(rule, '<ul><li /></ul>', jsx)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<ul>\n<li /></ul>', jsx)).violations).toStrictEqual([]);
	});

	test('Preprocessor Block', async () => {
		const jsx = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		};
		expect((await mlRuleTest(rule, '<ul aria-busy="true">{foo}</ul>', jsx)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<ul>{foo}</ul>', jsx)).violations).toStrictEqual([]);
	});

	test('Owned element has Preprocessor Block', async () => {
		expect(
			(await mlRuleTest(rule, '<table><tbody><tr><td>foo</td></tr></tbody></table>')).violations,
		).toStrictEqual([]);

		expect(
			(
				await mlRuleTest(rule, '<table><tbody>{list.map((item) => <tr><td>{item}</td></tr>)}</tbody></table>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
				})
			).violations,
		).toStrictEqual([]);
	});

	test('Omit <tbody>', async () => {
		expect((await mlRuleTest(rule, '<table><tr><td>foo</td></tr></table>')).violations).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<table><tbody><tr><td>foo</td></tr></tbody></table>')).violations,
		).toStrictEqual([]);
	});
});

describe('Presentational Children', () => {
	const enable = { rule: { options: { checkingPresentationalChildren: true } } };
	test('The role attribute in the button', async () => {
		expect(
			(await mlRuleTest(rule, '<button><div role="none">foo</div></button>', enable)).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message:
					'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
				raw: '<div role="none">',
			},
		]);
	});

	test('The aria-* attribute in the tab', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<ul role="tablist"><li role="tab"><span aria-hidden="true">foo</span></li></ul>',
					enable,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 35,
				message:
					'It may be ineffective because it has the "tab" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
				raw: '<span aria-hidden="true">',
			},
		]);
	});
});

describe('Including Elements in the Accessibility Tree', () => {
	const enable = { rule: { options: { checkingInteractionInHidden: true } } };
	test('Parent has aria-hidden', async () => {
		expect(
			(await mlRuleTest(rule, '<div aria-hidden="true"><button>foo</button></div>', enable)).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'It may be focusable in spite of it has the ancestor that has aria-hidden=true',
				raw: '<button>',
			},
		]);
	});

	test('Ancestor has aria-hidden', async () => {
		expect(
			(await mlRuleTest(rule, '<div aria-hidden="true"><span><button>foo</button></span></div>', enable))
				.violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 31,
				message: 'It may be focusable in spite of it has the ancestor that has aria-hidden=true',
				raw: '<button>',
			},
		]);
	});

	test('Has aria-hidden', async () => {
		expect(
			(await mlRuleTest(rule, '<div><span><button aria-hidden="true">foo</button></span></div>', enable))
				.violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'It may be focusable in spite of it has aria-hidden=true',
				raw: '<button aria-hidden="true">',
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
						options: {
							disallowSetImplicitRole: false,
						},
					},
				},
			],
		});

		expect(violations.length).toBe(0);
	});
});

describe('Pretenders Option', () => {
	test('list > listitem', async () => {
		expect(
			(
				await mlRuleTest(rule, '<ul><Item>item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item>item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Item',
							as: 'li',
						},
					],
				})
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item>item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Item',
							as: {
								element: 'div',
								attrs: [
									{
										name: 'role',
										value: 'listitem',
									},
								],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item role="listitem">item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item role="listitem">item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Item',
							as: {
								element: 'div',
							},
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item role="listitem">item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Item',
							as: {
								element: 'div',
								inheritAttrs: true,
							},
						},
					],
				})
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item role="listitem">item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Item',
							as: {
								element: 'div',
								attrs: [
									{
										name: 'role',
									},
								],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<ul><Item data-role="listitem">item</Item></ul>', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'Item',
							as: {
								element: 'div',
								attrs: [
									{
										name: 'role',
										value: {
											fromAttr: 'data-role',
										},
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

test('Booleanish', async () => {
	expect((await mlRuleTest(rule, '<div aria-hidden></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<div aria-hidden></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<div aria-hidden="invalid"></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "invalid" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden="invalid"',
		},
	]);
});

describe('Disallowed prop each element', () => {
	test('disabled link', async () => {
		const { violations } = await mlRuleTest(rule, '<a href="path/to" aria-disabled="true">disabled link</a>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 19,
				message:
					'The "aria-disabled" ARIA state is not recommended to use on the "a" element. Remove the "href" attribute if you use the ARIA state',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	// https://github.com/markuplint/markuplint/issues/745
	test('#745 Updated spec', async () => {
		const { violations } = await mlRuleTest(rule, '<html><body aria-hidden="true"></body></html>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message: 'The "aria-hidden" ARIA state must not use on the "body" element',
				raw: 'aria-hidden="true"',
			},
		]);
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

	test('#606', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<ul>
						<template>
							<li></li>
						</template>
					</ul>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
				raw: '<ul>',
			},
		]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<ul aria-busy="true">
						<template>
							<li></li>
						</template>
					</ul>`,
				)
			).violations,
		).toStrictEqual([]);

		expect(
			(
				await mlRuleTest(
					rule,
					`<ul>
						<!-- -->
					</ul>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
				raw: '<ul>',
			},
		]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<ul aria-busy="true">
						<!-- -->
					</ul>`,
				)
			).violations,
		).toStrictEqual([]);

		expect(
			(
				await mlRuleTest(
					rule,
					`<table>
						<caption>
							text
						</caption>
						<tbody>
							<template>
								<tr>
									<td></td>
								</tr>
							</template>
						</tbody>
					</table>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "table" role expects the roles: "row", "rowgroup > row"',
				raw: '<table>',
			},
			{
				severity: 'error',
				line: 5,
				col: 7,
				message: 'The child element requires the "row" role. Or, require aria-busy="true"',
				raw: '<tbody>',
			},
		]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<table>
						<caption>
							text
						</caption>
						<tbody>
							<tr>
								<td></td>
							</tr>
						</tbody>
					</table>`,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<table>
						<caption>
							text
						</caption>
						<tbody aria-busy="true">
							<template>
								<tr>
									<td></td>
								</tr>
							</template>
						</tbody>
					</table>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('#778', async () => {
		const jsx = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		};

		const sourceCode = '<td role="gridcell" aria-selected="true"></td>';
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, sourceCode, jsx)).violations).toStrictEqual([]);

		const sourceCode2 = '<div role="rowgroup"><div role="row"><div role="gridcell"></div></div></div>';
		expect((await mlRuleTest(rule, sourceCode2)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, sourceCode2, jsx)).violations).toStrictEqual([]);

		const sourceCode3 = '<table><tbody><tr><td role="gridcell"></td></tr></tbody></table>';
		expect((await mlRuleTest(rule, sourceCode3)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 29,
				message:
					'Cannot overwrite the "gridcell" role to the "td" element according to ARIA in HTML specification',
				raw: 'gridcell',
			},
		]);
		expect((await mlRuleTest(rule, sourceCode3, jsx)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 29,
				message:
					'Cannot overwrite the "gridcell" role to the "td" element according to ARIA in HTML specification',
				raw: 'gridcell',
			},
		]);
	});

	test('#1084', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
			<select multiple aria-label="some label text">
				<option>foo</option>
				<option>bar</option>
			</select>

			<select aria-label="some label text">
				<option>foo</option>
				<option>bar</option>
			</select>

			<select aria-label="some label text">
				<option>foo</option>
				<optgroup label="group">
					<option>bar</option>
				</optgroup>
			</select>

			<datalist>
				<option>foo</option>
				<option>bar</option>
			</datalist>
		`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('#1048', async () => {
		const config = {
			parser: {
				'.*': '@markuplint/vue-parser',
			},
		};

		const sourceCode = `
			<template>
				<ul v-if="props.examples.length > 0">
					<!-- Error if comment inserted inside ul element -->
					<li v-for="item in props.examples" :key="item.id">
						{{ item.name }}
					</li>
				</ul>
			</template>
		`;
		expect((await mlRuleTest(rule, sourceCode, config)).violations).toStrictEqual([]);
	});

	test('#1498', async () => {
		const sourceCode = `<ol role="directory">
	<li aria-dropeffect="none">text</li>
</ol>`;
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The "directory" role is deprecated',
				raw: 'role="directory"',
			},
		]);
	});

	test('#1517', async () => {
		const config = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		};

		expect(
			(
				await mlRuleTest(
					rule,
					`<input
type="checkbox"
role="switch"
{...otherProps}
/>`,
					config,
				)
			).violations,
		).toStrictEqual([
			{
				col: 1,
				line: 1,
				message: 'Require the "aria-checked" ARIA state on the "switch" role',
				raw: `<input
type="checkbox"
role="switch"
{...otherProps}
/>`,
				severity: 'error',
			},
		]);

		expect(
			(
				await mlRuleTest(
					rule,
					`<input
type="checkbox"
role="switch"
checked={isChecked}
{...otherProps}
/>`,
					config,
				)
			).violations,
		).toStrictEqual([]);

		expect(
			(
				await mlRuleTest(
					rule,
					`<input
type="checkbox"
role="switch"
checked={isChecked}
aria-checked={isChecked}
{...otherProps}
/>`,
					config,
				)
			).violations,
		).toStrictEqual([
			{
				col: 1,
				line: 5,
				message:
					'The "aria-checked" ARIA state must not use on the "input" element. As its state is already provided by the "checked" attribute',
				raw: 'aria-checked={isChecked}',
				severity: 'error',
			},
		]);
	});
});
