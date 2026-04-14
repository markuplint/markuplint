import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe("Use the role that doesn't exist in the spec", () => {
	test('[wai-aria-invalid-001] [role=hoge]', async () => {
		expect((await mlRuleTest(rule, '<div role="hoge"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'The "hoge" role does not exist according to the WAI-ARIA specification.',
				raw: 'hoge',
			},
		]);

		expect((await mlRuleTest(rule, '<div role="none hoge"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message: 'The "hoge" role does not exist according to the WAI-ARIA specification.',
				raw: 'hoge',
			},
		]);
	});

	test('[wai-aria-invalid-002] Graphics ARIA to HTML', async () => {
		expect((await mlRuleTest(rule, '<div role="graphics-document"></div>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'The "graphics-document" role does not exist according to the WAI-ARIA specification.',
				raw: 'graphics-document',
			},
		]);

		expect((await mlRuleTest(rule, '<svg><rect role="graphics-document"></rect></svg>')).violations).toStrictEqual(
			[],
		);
	});

	test('[wai-aria-issue-1490] DPub ARIA roles (#1490)', async () => {
		expect((await mlRuleTest(rule, '<div role="doc-abstract"><p>text</p></div>')).violations).toStrictEqual([]);

		expect((await mlRuleTest(rule, '<div role="doc-backlink">Back</div>')).violations).toStrictEqual([]);

		expect((await mlRuleTest(rule, '<div role="doc-pagebreak"></div>')).violations).toStrictEqual([]);

		expect(
			(await mlRuleTest(rule, '<div role="doc-toc"><ol><li>Chapter 1</li></ol></div>')).violations,
		).toStrictEqual([]);
	});
});

describe('Use the abstract role', () => {
	test('[wai-aria-invalid-003] [role=roletype]', async () => {
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
	test('[wai-aria-invalid-004] [aria-checked=true]', async () => {
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

	test('[wai-aria-invalid-005] [aria-checked=true]', async () => {
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

	test('[wai-aria-invalid-006] button[aria-checked=true]', async () => {
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

	test('[wai-aria-valid-001] button[aria-pressed=true]', async () => {
		const { violations } = await mlRuleTest(rule, '<button aria-pressed="true"></button>');

		expect(violations.length).toBe(0);
	});
});

describe('Use an invalid value of the property/state', () => {
	test('[wai-aria-invalid-007] [aria-current=foo]', async () => {
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

	test('[wai-aria-valid-002] [aria-current=page]', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-current="page"></div>');

		expect(violations.length).toBe(0);
	});

	test('[wai-aria-valid-003] disabled', async () => {
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
	test('[wai-aria-invalid-008] script[role=link]', async () => {
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

	test('[wai-aria-invalid-009] a[role=document]', async () => {
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

	test('[wai-aria-valid-004] disabled', async () => {
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
	test('[wai-aria-invalid-010] heading needs aria-level', async () => {
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

	test("[wai-aria-valid-005] h1 element doesn't needs aria-level", async () => {
		const { violations } = await mlRuleTest(rule, '<h1></h1>');

		expect(violations).toStrictEqual([]);
	});
});

describe('Set the implicit role explicitly', () => {
	test('[wai-aria-invalid-011] a[href][role=link]', async () => {
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

	test('[wai-aria-invalid-012] header[role=banner]', async () => {
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

	test('[wai-aria-valid-006] disabled', async () => {
		const { violations } = await mlRuleTest(rule, '<a href="path/to" role="link"></a>', {
			rule: {
				options: {
					disallowSetImplicitRole: false,
				},
			},
		});

		expect(violations.length).toBe(0);
	});

	test('[wai-aria-invalid-013] The `as` attribute', async () => {
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
	test('[wai-aria-invalid-014] aria-live="off"', async () => {
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
	test('[wai-aria-invalid-015] aria-disabled is deprecated in article', async () => {
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

	test('[wai-aria-invalid-016] aria-disabled is deprecated in article role', async () => {
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

	test('[wai-aria-valid-007] disable', async () => {
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
	test('[wai-aria-invalid-017] checked and aria-checked="true"', async () => {
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

	test('[wai-aria-invalid-018] checked and aria-checked="false"', async () => {
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

	test('[wai-aria-invalid-019] only aria-checked="true"', async () => {
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

	test('[wai-aria-invalid-020] check and aria-checked="mixed"', async () => {
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

	test('[wai-aria-invalid-021] placeholder="type hints" and aria-placeholder="type hints"', async () => {
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

	test('[wai-aria-invalid-022] placeholder="type hints" and aria-placeholder="different value"', async () => {
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

	test('[wai-aria-invalid-023] hidden vs aria-hidden', async () => {
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

	test('[wai-aria-valid-008] disable', async () => {
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

describe('Allowed Accessibility Child Roles', () => {
	test('[wai-aria-valid-009] Empty content', async () => {
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

	test('[wai-aria-valid-010] Empty content (Implicit role)', async () => {
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

	test('[wai-aria-valid-011] Invalid contents', async () => {
		expect((await mlRuleTest(rule, '<table><tbody><tr><td></td></tr></tbody></table>')).violations).toStrictEqual(
			[],
		);
		expect((await mlRuleTest(rule, '<table><tr><td></td></tr></table>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<table><tbody></tbody></table>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "table" role expects the roles: "caption", "row", "rowgroup > row"',
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

	test('[wai-aria-invalid-024] Invalid contents', async () => {
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

	test('[wai-aria-valid-012] Valid contents', async () => {
		const jsx = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		};
		expect((await mlRuleTest(rule, '<ul><li /></ul>', jsx)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<ul>\n<li /></ul>', jsx)).violations).toStrictEqual([]);
	});

	test('[wai-aria-valid-013] Preprocessor Block', async () => {
		const jsx = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		};
		expect((await mlRuleTest(rule, '<ul aria-busy="true">{foo}</ul>', jsx)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<ul>{foo}</ul>', jsx)).violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-025] Owned element has Preprocessor Block', async () => {
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

	test('[wai-aria-valid-014] Omit <tbody>', async () => {
		expect((await mlRuleTest(rule, '<table><tr><td>foo</td></tr></table>')).violations).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<table><tbody><tr><td>foo</td></tr></tbody></table>')).violations,
		).toStrictEqual([]);
	});
});

describe('Presentational Children', () => {
	const enable = { rule: { options: { checkingPresentationalChildren: true } } };
	test('[wai-aria-invalid-026] The role attribute in the button', async () => {
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

	test('[wai-aria-invalid-027] The aria-* attribute in the tab', async () => {
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
	test('[wai-aria-invalid-028] Parent has aria-hidden', async () => {
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

	test('[wai-aria-invalid-029] Ancestor has aria-hidden', async () => {
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

	test('[wai-aria-invalid-030] Has aria-hidden', async () => {
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
	test('[wai-aria-valid-015] ex. For Safari + VoiceOver', async () => {
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
	test('[wai-aria-invalid-031] list > listitem', async () => {
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

test('[wai-aria-invalid-032] Booleanish', async () => {
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
	test('[wai-aria-invalid-033] disabled link', async () => {
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
	test('[wai-aria-issue-745] #745 Updated spec', async () => {
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
	test('[wai-aria-issue-397] #397', async () => {
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

	test('[wai-aria-issue-606] #606', async () => {
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

	test('[wai-aria-issue-778] #778', async () => {
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

	test('[wai-aria-issue-1084] #1084', async () => {
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

	test('[wai-aria-issue-1048] #1048', async () => {
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

	test('[wai-aria-issue-1498] #1498', async () => {
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

	test('[wai-aria-issue-1517] #1517', async () => {
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

describe('button element permitted roles', () => {
	test('[wai-aria-valid-016] button with role="separator" is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button role="separator" aria-valuenow="50">Drag to resize</button>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-valid-017] button with role="gridcell" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<button role="gridcell">Cell</button>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-valid-018] button with role="slider" is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100">50</button>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-valid-019] button with role="treeitem" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<button role="treeitem">Item</button>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-valid-020] button with role="tab" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<button role="tab">Tab 1</button>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-034] button with role="navigation" is not permitted', async () => {
		const { violations } = await mlRuleTest(rule, '<button role="navigation">Nav</button>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message:
					'Cannot overwrite the "navigation" role to the "button" element according to ARIA in HTML specification',
				raw: 'navigation',
			},
		]);
	});

	test('[wai-aria-invalid-035] button with role="separator" is not permitted in ARIA 1.1', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<button role="separator" aria-valuenow="50">Drag to resize</button>',
			{ rule: { options: { version: '1.1' } } },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message:
					'Cannot overwrite the "separator" role to the "button" element according to ARIA in HTML specification',
				raw: 'separator',
			},
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "aria-valuenow" ARIA property is disallowed on the "button" role',
				raw: 'aria-valuenow="50"',
			},
		]);
	});
});

describe('meter element implicit role', () => {
	test('[wai-aria-valid-021] meter has implicit role "meter"', async () => {
		const { violations } = await mlRuleTest(rule, '<meter value="50" min="0" max="100">50%</meter>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-036] meter with explicit role="meter" is redundant', async () => {
		const { violations } = await mlRuleTest(rule, '<meter value="50" min="0" max="100" role="meter">50%</meter>');
		expect(violations.length).toBeGreaterThan(0);
	});

	test('[wai-aria-invalid-037] meter does not permit role overwriting', async () => {
		const { violations } = await mlRuleTest(rule, '<meter value="50" min="0" max="100" role="button">50%</meter>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 43,
				message:
					'Cannot overwrite the "button" role to the "meter" element according to ARIA in HTML specification',
				raw: 'button',
			},
		]);
	});
});

describe('html element implicit role', () => {
	test('[wai-aria-valid-022] html with role="document" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<html role="document"><head></head><body></body></html>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-038] html with role="generic" is implicit role (redundant)', async () => {
		const { violations } = await mlRuleTest(rule, '<html role="generic"><head></head><body></body></html>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message: 'The "generic" role is the implicit role of the "html" element',
				raw: 'generic',
			},
		]);
	});

	test('[wai-aria-invalid-039] html with role="banner" is not permitted', async () => {
		const { violations } = await mlRuleTest(rule, '<html role="banner"><head></head><body></body></html>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message:
					'Cannot overwrite the "banner" role to the "html" element according to ARIA in HTML specification',
				raw: 'banner',
			},
		]);
	});

	test('[wai-aria-invalid-040] html with role="document" is implicit role in ARIA 1.1 (redundant)', async () => {
		const { violations } = await mlRuleTest(rule, '<html role="document"><head></head><body></body></html>', {
			rule: { options: { version: '1.1' } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message: 'The "document" role is the implicit role of the "html" element',
				raw: 'document',
			},
		]);
	});
});

describe('img element permitted roles', () => {
	test('[wai-aria-valid-023] img with role="math" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="equation.png" alt="x²+y²=z²" role="math">');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-valid-024] img with role="meter" is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="progress.png" alt="75% complete" role="meter" aria-valuenow="75">',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-041] img with role="math" is not permitted in ARIA 1.1', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="equation.png" alt="x²+y²=z²" role="math">', {
			rule: { options: { version: '1.1' } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'Cannot overwrite the "math" role to the "img" element according to ARIA in HTML specification',
				raw: 'math',
			},
		]);
	});

	test('[wai-aria-invalid-042] img with role="navigation" is not permitted', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="test.png" alt="test" role="navigation">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 38,
				message:
					'Cannot overwrite the "navigation" role to the "img" element according to ARIA in HTML specification',
				raw: 'navigation',
			},
		]);
	});

	test('[wai-aria-valid-025] img with role="image" is valid in ARIA 1.3 (image/img synonym)', async () => {
		// In ARIA 1.3, "image" is a synonym of "img". The implicit role of <img> is "img",
		// so "image" is technically a distinct string and the implicit role checker does not flag it.
		const { violations } = await mlRuleTest(rule, '<img src="test.png" alt="test" role="image">', {
			rule: { options: { version: '1.3' } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('ARIA 1.3 — Generic role transparency', () => {
	const v13 = { rule: { options: { version: '1.3' as const } } };
	const v12 = { rule: { options: { version: '1.2' as const } } };

	test('[wai-aria-valid-026] generic wrapper is transparent for owned elements in 1.3', async () => {
		// In 1.3, <div> (generic) is transparent — <li> is reachable as owned element of <ul>
		expect((await mlRuleTest(rule, '<ul><div><li>item</li></div></ul>', v13)).violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-043] generic wrapper is NOT transparent for owned elements in 1.2', async () => {
		// In 1.2, <div> blocks the list > listitem relationship
		const { violations } = await mlRuleTest(rule, '<ul><div><li>item</li></div></ul>', v12);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
	});

	test('[wai-aria-invalid-044] nested generic wrappers are transparent in 1.3', async () => {
		expect((await mlRuleTest(rule, '<ul><div><div><li>item</li></div></div></ul>', v13)).violations).toStrictEqual(
			[],
		);
	});

	test('[wai-aria-invalid-045] non-generic wrapper still blocks in 1.3', async () => {
		// <section> has implicit role "region" (when named) or "generic" (when unnamed in some cases)
		// but actually <nav> has implicit role "navigation" — not transparent
		const { violations } = await mlRuleTest(rule, '<ul><nav><li>item</li></nav></ul>', v13);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<ul>',
			},
		]);
	});

	test('[wai-aria-valid-027] list > listitem via context role is valid in 1.3 with generic wrapper', async () => {
		// <li> has requiredAccessibilityParentRole: ["list", "list > group"]
		// In 1.3, the <div> (generic) is transparent so <ul> (list) is found as the parent
		expect((await mlRuleTest(rule, '<ul><div><li>item</li></div></ul>', v13)).violations).toStrictEqual([]);
	});
});

describe('ARIA 1.3 — checkingAllowedAccessibilityChildRoles option', () => {
	test('[wai-aria-valid-028] new option false disables the check', async () => {
		const { violations } = await mlRuleTest(rule, '<ul></ul>', {
			rule: { options: { checkingAllowedAccessibilityChildRoles: false } },
		});
		// Should NOT report "The child element requires the listitem role"
		expect(violations.filter(v => v.message.includes('listitem'))).toStrictEqual([]);
	});

	test('[wai-aria-valid-029] old option false still disables the check (backward compat)', async () => {
		const { violations } = await mlRuleTest(rule, '<ul></ul>', {
			rule: { options: { checkingRequiredOwnedElements: false } },
		});
		expect(violations.filter(v => v.message.includes('listitem'))).toStrictEqual([]);
	});

	test('[wai-aria-invalid-046] both options true enables the check (default)', async () => {
		const { violations } = await mlRuleTest(rule, '<ul></ul>');
		expect(violations.some(v => v.message.includes('listitem'))).toBe(true);
	});
});

describe('ARIA 1.3 — image/img synonym in permitted roles', () => {
	test('[wai-aria-valid-030] img element with role="image" is permitted in 1.3', async () => {
		// In ARIA 1.3, "image" is a synonym for "img", so it's a valid permitted role
		const { violations } = await mlRuleTest(rule, '<img src="test.png" alt="test" role="image">', {
			rule: { options: { version: '1.3', disallowSetImplicitRole: false } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-invalid-047] img element with role="image" is NOT permitted in 1.2', async () => {
		// In ARIA 1.2, the "image" role does not exist (only "img" does),
		// so the non-existent role check fires first.
		const { violations } = await mlRuleTest(rule, '<img src="test.png" alt="test" role="image">', {
			rule: { options: { version: '1.2' } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 38,
				message: 'The "image" role does not exist according to the WAI-ARIA specification.',
				raw: 'image',
			},
		]);
	});

	test('[wai-aria-invalid-048] img[alt=""] with role="none" is valid in 1.3', async () => {
		// The implicit role of <img alt=""> is "presentation". Although "none" and "presentation"
		// are synonyms, the implicit role checker compares strings, so no violation is raised.
		expect(
			(
				await mlRuleTest(rule, '<img src="spacer.gif" alt="" role="none">', {
					rule: { options: { version: '1.3' } },
				})
			).violations,
		).toStrictEqual([]);
	});
});

// #816: gridcell context role — should only be valid in grid/treegrid, not table
// The ARIA spec says gridcell's requiredContextRole is ["row"], so any row is accepted.
// However, <td role="gridcell"> in a <table> is caught by the permittedAriaRoles check
// (ARIA in HTML spec forbids overwriting td to gridcell in a table context).
// Verdict: Detected via permittedAriaRoles, not requiredContextRole. Issue is addressed.
describe('Issue #816 — gridcell context role validation', () => {
	const v1_2 = { rule: { options: { version: '1.2' as const } } };
	const v1_3 = { rule: { options: { version: '1.3' as const } } };

	test('[wai-aria-issue-816-001] grid > row > gridcell is valid (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="grid"><div role="row"><div role="gridcell">Cell</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-816-002] grid > row > gridcell is valid (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="grid"><div role="row"><div role="gridcell">Cell</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-816-003] treegrid > row > gridcell is valid (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="treegrid"><div role="row"><div role="gridcell">Cell</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-816-004] treegrid > row > gridcell is valid (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="treegrid"><div role="row"><div role="gridcell">Cell</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-816-005] table > rowgroup > row > td[gridcell] is detected by permittedAriaRoles (1.2)', async () => {
		// The permittedAriaRoles check catches td being overwritten to gridcell in a table
		const { violations } = await mlRuleTest(
			rule,
			'<table><tbody><tr><td role="gridcell">Cell</td></tr></tbody></table>',
			v1_2,
		);
		expect(violations).toStrictEqual([
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

	test('[wai-aria-issue-816-006] table > rowgroup > row > td[gridcell] is detected by permittedAriaRoles (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<table><tbody><tr><td role="gridcell">Cell</td></tr></tbody></table>',
			v1_3,
		);
		expect(violations).toStrictEqual([
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

	test('[wai-aria-issue-816-007] table > row > cell is valid (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tbody><tr><td>Cell</td></tr></tbody></table>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-816-008] table > row > cell is valid (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tbody><tr><td>Cell</td></tr></tbody></table>', v1_3);
		expect(violations).toStrictEqual([]);
	});
});

// #673: presentation/none wrapper transparency for required owned elements
// In 1.2, radiogroup.requiredOwnedElements = ["radio"], presentation/none should be transparent.
// In 1.3, radiogroup.requiredOwnedElements = [] — the check doesn't fire at all.
// Verdict: presentation transparency works in both versions. Issue is resolved.
describe('Issue #673 — presentation wrapper transparency', () => {
	const v1_2 = { rule: { options: { version: '1.2' as const } } };
	const v1_3 = { rule: { options: { version: '1.3' as const } } };

	test('[wai-aria-issue-673-001] radiogroup > radio (direct child) is valid (1.2)', async () => {
		// radio role requires aria-checked
		const { violations } = await mlRuleTest(
			rule,
			'<div role="radiogroup"><div role="radio" aria-checked="false">Option 1</div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-673-002] radiogroup > radio (direct child) is valid (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="radiogroup"><div role="radio" aria-checked="false">Option 1</div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-673-003] radiogroup > li[presentation] > button[radio] — no requiredOwnedElements violation (1.2)', async () => {
		// The only violation should be about aria-checked on the radio, NOT about
		// radiogroup missing its required owned radio element (presentation is transparent)
		const { violations } = await mlRuleTest(
			rule,
			'<div role="radiogroup"><li role="presentation"><button role="radio">Option 1</button></li></div>',
			v1_2,
		);
		const ownedElementViolations = violations.filter(v => v.message.includes('radio" role'));
		// Should only have "Require aria-checked", not "requires the radio role"
		expect(ownedElementViolations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 48,
				message: 'Require the "aria-checked" ARIA state on the "radio" role',
				raw: '<button role="radio">',
			},
		]);
	});

	test('[wai-aria-issue-673-004] radiogroup > li[presentation] > button[radio] with aria-checked is valid (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="radiogroup"><li role="presentation"><button role="radio" aria-checked="false">Option 1</button></li></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-673-005] radiogroup > li[presentation] > button[radio] with aria-checked is valid (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="radiogroup"><li role="presentation"><button role="radio" aria-checked="false">Option 1</button></li></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-673-006] radiogroup > li[none] > button[radio] with aria-checked is valid (1.2)', async () => {
		// "none" is a synonym for "presentation" — should also be transparent
		const { violations } = await mlRuleTest(
			rule,
			'<div role="radiogroup"><li role="none"><button role="radio" aria-checked="false">Option 1</button></li></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});
});

// #272: Allowed descendants of ARIA roles (requiredOwnedElements)
// Tests that requiredOwnedElements checks work correctly in both ARIA versions.
// In 1.3, the "table" role expects "caption", "row", "rowgroup > row" (1.2 has no caption).
// In 1.3, generic (div) wrappers are transparent for owned element checks.
// Verdict: checkingRequiredOwnedElements works correctly in both versions.
describe('Issue #272 — Allowed descendants of ARIA roles', () => {
	const v1_2 = { rule: { options: { version: '1.2' as const } } };
	const v1_3 = { rule: { options: { version: '1.3' as const } } };

	test('[wai-aria-issue-272-001] table without row is a violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="table"><div>content</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "table" role expects the roles: "row", "rowgroup > row"',
				raw: '<div role="table">',
			},
		]);
	});

	test('[wai-aria-issue-272-002] table without row is a violation (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="table"><div>content</div></div>', v1_3);
		// 1.3 adds "caption" to the expected roles
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "table" role expects the roles: "caption", "row", "rowgroup > row"',
				raw: '<div role="table">',
			},
		]);
	});

	test('[wai-aria-issue-272-003] list without listitem is a violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><div>content</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<div role="list">',
			},
		]);
	});

	test('[wai-aria-issue-272-004] list without listitem is a violation (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><div>content</div></div>', v1_3);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<div role="list">',
			},
		]);
	});

	test('[wai-aria-issue-272-005] list > listitem is valid (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><div role="listitem">Item</div></div>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-272-006] list > listitem is valid (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><div role="listitem">Item</div></div>', v1_3);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-272-007] list > div > listitem (1.2) — generic is NOT transparent', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><div><div role="listitem">Item</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "list" role expects the "listitem" role',
				raw: '<div role="list">',
			},
			{
				severity: 'error',
				line: 1,
				col: 34,
				message:
					'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"',
				raw: 'listitem',
			},
		]);
	});

	test('[wai-aria-issue-272-008] list > div > listitem (1.3) — generic IS transparent', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="list"><div><div role="listitem">Item</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('Issue #2465 — aria-valuenow restrictions and missing alt fields', () => {
	test('[wai-aria-issue-2465-001] input[type=range] with value and aria-valuenow', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="range" value="50" aria-valuenow="50">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-valuenow" ARIA property should not use on the "input" element. As its state is already provided by the "value" attribute',
				raw: 'aria-valuenow="50"',
			},
		]);
	});

	test('[wai-aria-issue-2465-002] input[type=range] with aria-valuenow but no value attr', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="range" aria-valuenow="50">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				message:
					'The "aria-valuenow" ARIA property should not use on the "input" element. Add the "value" attribute if you use the ARIA property',
				raw: 'aria-valuenow="50"',
			},
		]);
	});

	test('[wai-aria-issue-2465-003] input[type=range] with value and aria-valuemax', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="range" value="50" aria-valuemax="100">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-valuemax" ARIA property should not use on the "input" element. Add the "max" attribute if you use the ARIA property',
				raw: 'aria-valuemax="100"',
			},
		]);
	});

	test('[wai-aria-issue-2465-004] input[type=range] with aria-valuemax but no max attr', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="range" aria-valuemax="100">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				message:
					'The "aria-valuemax" ARIA property should not use on the "input" element. Add the "max" attribute if you use the ARIA property',
				raw: 'aria-valuemax="100"',
			},
		]);
	});

	test('[wai-aria-issue-2465-005] input[type=number] with value and aria-valuenow', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="number" value="5" aria-valuenow="5">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-valuenow" ARIA property should not use on the "input" element. As its state is already provided by the "value" attribute',
				raw: 'aria-valuenow="5"',
			},
		]);
	});

	test('[wai-aria-issue-2465-006] input[type=number] with aria-valuemax', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="number" aria-valuemax="10">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 22,
				message:
					'The "aria-valuemax" ARIA property should not use on the "input" element. Add the "max" attribute if you use the ARIA property',
				raw: 'aria-valuemax="10"',
			},
		]);
	});

	test('[wai-aria-issue-2465-007] meter with value and aria-valuenow', async () => {
		const { violations } = await mlRuleTest(rule, '<meter value="0.6" aria-valuenow="0.6"></meter>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message:
					'The "aria-valuenow" ARIA property should not use on the "meter" element. As its state is already provided by the "value" attribute',
				raw: 'aria-valuenow="0.6"',
			},
		]);
	});

	test('[wai-aria-issue-2465-008] meter with value and aria-valuemax', async () => {
		const { violations } = await mlRuleTest(rule, '<meter value="0.6" aria-valuemax="1"></meter>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message:
					'The "aria-valuemax" ARIA property should not use on the "meter" element. Add the "max" attribute if you use the ARIA property',
				raw: 'aria-valuemax="1"',
			},
		]);
	});

	test('[wai-aria-issue-2465-009] progress with value and aria-valuenow', async () => {
		const { violations } = await mlRuleTest(rule, '<progress value="70" max="100" aria-valuenow="70"></progress>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-valuenow" ARIA property should not use on the "progress" element. As its state is already provided by the "value" attribute',
				raw: 'aria-valuenow="70"',
			},
		]);
	});

	test('[wai-aria-issue-2465-010] progress with value and aria-valuemax', async () => {
		const { violations } = await mlRuleTest(rule, '<progress value="70" max="100" aria-valuemax="100"></progress>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-valuemax" ARIA property should not use on the "progress" element. As its state is already provided by the "max" attribute',
				raw: 'aria-valuemax="100"',
			},
			{
				severity: 'error',
				line: 1,
				col: 32,
				message:
					'The "aria-valuemax" ARIA property has the same semantics as the current "max" attribute or the implicit "max" attribute',
				raw: 'aria-valuemax="100"',
			},
		]);
	});

	// #3214: option[aria-selected] inside select now works because the implicit role
	// context check is skipped (combobox/option mismatch no longer causes false positive).
	test('[wai-aria-issue-3214-001] option[aria-selected] inside select reports without message (#3214)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<select><option selected aria-selected="true">A</option></select>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message:
					'The "aria-selected" ARIA state should not use on the "option" element. As its state is already provided by the "selected" attribute',
				raw: 'aria-selected="true"',
			},
		]);
	});

	test('[wai-aria-issue-2465-011] select with multiple and aria-multiselectable', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<select multiple aria-multiselectable="true"><option>A</option></select>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 18,
				message:
					'The "aria-multiselectable" ARIA property should not use on the "select" element. As its state is already provided by the "multiple" attribute',
				raw: 'aria-multiselectable="true"',
			},
		]);
	});
});

// #3214: getComputedRole returns null for option inside select due to
// Required Context Role mismatch (combobox vs listbox). Fixed by skipping
// the context role check for implicit roles.
describe('Issue #3214 — implicit role context check skip', () => {
	test('[wai-aria-issue-3214-002] option inside select has correct computed role (no false positive)', async () => {
		// Before fix: getComputedRole returned null for option, causing checkingNoGlobalProp
		// to fire incorrectly. After fix: option keeps its implicit role.
		const { violations } = await mlRuleTest(rule, '<select><option>A</option></select>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3214-003] option inside datalist has correct computed role', async () => {
		const { violations } = await mlRuleTest(rule, '<datalist><option>A</option></datalist>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3214-004] td inside tr inside table has correct computed role', async () => {
		const { violations } = await mlRuleTest(rule, '<table><tr><td>Cell</td></tr></table>');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3214-005] li inside ul has correct computed role', async () => {
		const { violations } = await mlRuleTest(rule, '<ul><li>Item</li></ul>');
		expect(violations).toStrictEqual([]);
	});
});

// #970: Required Accessibility Parent Role (Required Context Role) validation.
// Reports when an explicit role is used outside its required parent context.
describe('Issue #970 — Required Accessibility Parent Role check', () => {
	const v1_2 = { rule: { options: { version: '1.2' as const } } };
	const v1_3 = { rule: { options: { version: '1.3' as const } } };

	test('[wai-aria-issue-970-001] tab without tablist parent — violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="tab">Tab</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message: 'The "tab" role requires an accessibility parent with the "tablist" role',
				raw: 'tab',
			},
		]);
	});

	test('[wai-aria-issue-970-002] tab without tablist parent — violation (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="tab">Tab</div></div>', v1_3);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message: 'The "tab" role requires an accessibility parent with the "tablist" role',
				raw: 'tab',
			},
		]);
	});

	test('[wai-aria-issue-970-003] tab inside tablist — valid (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="tablist"><div role="tab">Tab</div></div>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-004] tab inside tablist — valid (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="tablist"><div role="tab">Tab</div></div>', v1_3);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-005] listitem without list parent — violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="listitem">Item</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message:
					'The "listitem" role requires an accessibility parent with one of the roles: "directory", "list"',
				raw: 'listitem',
			},
		]);
	});

	test('[wai-aria-issue-970-006] listitem inside list — valid (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="list"><div role="listitem">Item</div></div>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-007] treeitem without tree/treegrid parent — violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="treeitem">Item</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message: 'The "treeitem" role requires an accessibility parent with one of the roles: "group", "tree"',
				raw: 'treeitem',
			},
		]);
	});

	test('[wai-aria-issue-970-008] treeitem inside tree — valid (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="tree"><div role="treeitem">Item</div></div>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-009] tab inside generic > tablist — valid (1.3, generic transparent)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="tablist"><div><div role="tab">Tab</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-010] tab inside generic > tablist — violation in 1.2 (generic NOT transparent)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="tablist"><div><div role="tab">Tab</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "tablist" role expects the "tab" role',
				raw: '<div role="tablist">',
			},
			{
				severity: 'error',
				line: 1,
				col: 37,
				message: 'The "tab" role requires an accessibility parent with the "tablist" role',
				raw: 'tab',
			},
		]);
	});

	test('[wai-aria-issue-970-011] option with explicit role outside listbox — violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="option">Opt</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message: 'The "option" role requires an accessibility parent with one of the roles: "group", "listbox"',
				raw: 'option',
			},
		]);
	});

	test('[wai-aria-issue-3214-006] option (implicit) inside select — no context violation (#3214)', async () => {
		// Implicit roles skip context check — HTML spec handles this
		const { violations } = await mlRuleTest(rule, '<select><option>A</option></select>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-012] disabled via option — no context violation reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="tab">Tab</div></div>', {
			rule: { options: { version: '1.2' as const, checkingRequiredAccessibilityParentRole: false } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-013] root fragment with explicit role — no violation (parentElement is null)', async () => {
		// A root element fragment cannot satisfy context role, but should not crash.
		// NO_OWNER with role kept (parentElement === null) means root fragment — skip.
		const { violations } = await mlRuleTest(rule, '<div role="tab">Tab</div>', v1_2);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-014] group transparency: listbox > group > option (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="listbox"><div role="group"><div role="option">Opt</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-015] group transparency: tree > treeitem > group > treeitem (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="tree"><div role="treeitem"><div role="group"><div role="treeitem">Item</div></div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-016] group transparency: menu > group > menuitem (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="menu"><div role="group"><div role="menuitem">Item</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-017] table > row via pure ARIA divs (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="table"><div role="row"><div role="cell">Cell</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-018] generic NOT transparent for context role in 1.2: listbox > div > option', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="listbox"><div><div role="option">Opt</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The "listbox" role expects the roles: "group > option", "option"',
				raw: '<div role="listbox">',
			},
			{
				severity: 'error',
				line: 1,
				col: 37,
				message: 'The "option" role requires an accessibility parent with one of the roles: "group", "listbox"',
				raw: 'option',
			},
		]);
	});

	// #5: Missing role coverage — caption
	test('[wai-aria-issue-970-019] caption inside table — valid (1.3)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="table"><div role="caption">Caption</div><div role="row"><div role="cell">Cell</div></div></div>',
			v1_3,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-020] caption outside table — violation (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="caption">Caption</div></div>', v1_3);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message:
					'The "caption" role requires an accessibility parent with one of the roles: "figure", "grid", "group", "radiogroup", "table", "treegrid"',
				raw: 'caption',
			},
		]);
	});

	// #5: Missing role coverage — menuitemcheckbox
	test('[wai-aria-issue-970-021] menuitemcheckbox inside menu — valid (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="menu"><div role="menuitemcheckbox" aria-checked="false">Check</div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	// Only the context role violation is expected here.
	// Although menuitemcheckbox requires aria-checked, the role is
	// nullified (role: null) when the required parent context is not
	// satisfied, so the required state check does not run.
	test('[wai-aria-issue-970-022] menuitemcheckbox outside menu — violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="menuitemcheckbox">Check</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message:
					'The "menuitemcheckbox" role requires an accessibility parent with one of the roles: "group", "menu", "menubar"',
				raw: 'menuitemcheckbox',
			},
		]);
	});

	// #5: Missing role coverage — menuitemradio
	test('[wai-aria-issue-970-023] menuitemradio inside menu — valid (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="menu"><div role="menuitemradio" aria-checked="false">Radio</div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-970-024] menuitemradio outside menu — violation (1.2)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="menuitemradio">Radio</div></div>', v1_2);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message:
					'The "menuitemradio" role requires an accessibility parent with one of the roles: "group", "menu", "menubar"',
				raw: 'menuitemradio',
			},
		]);
	});

	// #9: ARIA 1.3 option explicit role test
	test('[wai-aria-issue-970-025] option with explicit role outside listbox — violation (1.3)', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div role="option">Opt</div></div>', v1_3);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message:
					'The "option" role requires an accessibility parent with one of the roles: "listbox", "listbox > group"',
				raw: 'option',
			},
		]);
	});

	// #10: ARIA 1.2 tree > treeitem > group > treeitem
	test('[wai-aria-issue-970-026] group transparency: tree > treeitem > group > treeitem (1.2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="tree"><div role="treeitem"><div role="group"><div role="treeitem">Item</div></div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	// #11: ARIA 1.1 basic test
	test('[wai-aria-issue-970-027] tab without tablist parent — violation (1.1)', async () => {
		const v1_1 = { rule: { options: { version: '1.1' as const } } };
		const { violations } = await mlRuleTest(rule, '<div><div role="tab">Tab</div></div>', v1_1);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				message: 'The "tab" role requires an accessibility parent with the "tablist" role',
				raw: 'tab',
			},
		]);
	});

	// #12: presentation/none transparency in ARIA 1.2
	test('[wai-aria-issue-970-028] presentation parent transparent for context role in 1.2: menu > none > menuitem', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="menu"><div role="none"><div role="menuitem">Item</div></div></div>',
			v1_2,
		);
		expect(violations).toStrictEqual([]);
	});

	// Presentational role conflict resolution: none + focusable resolves to generic
	test('[wai-aria-issue-970-029] none+focusable parent resolves to generic — violation in 1.2', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="menu"><div role="none" tabindex="0"><div role="menuitem">Item</div></div></div>',
			v1_2,
		);
		// none+focusable → conflict resolution resolves to generic → not transparent in 1.2
		expect(violations.length).toBeGreaterThan(0);
	});

	test('[wai-aria-issue-970-030] none+focusable parent resolves to generic — valid in 1.3', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div role="menu"><div role="none" tabindex="0"><div role="menuitem">Item</div></div></div>',
			v1_3,
		);
		// none+focusable → conflict resolution resolves to generic → transparent in 1.3
		expect(violations).toStrictEqual([]);
	});
});

// #3588: input element permitted roles false positives
describe('Issue #3588 — input element permitted roles', () => {
	// input[type=reset] should allow same roles as button element
	test('[wai-aria-issue-3588-001] input[type=reset] with role="link" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="reset" role="link">');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3588-002] input[type=reset] with role="switch" — no permitted-roles violation', async () => {
		// switch requires aria-checked, so a required-state violation is expected,
		// but there must be NO "Cannot overwrite" permitted-roles violation.
		const { violations } = await mlRuleTest(rule, '<input type="reset" role="switch">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "aria-checked" ARIA state on the "switch" role',
				raw: '<input type="reset" role="switch">',
			},
		]);
	});

	test('[wai-aria-issue-3588-003] input[type=reset] with role="switch" and aria-checked is fully valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="reset" role="switch" aria-checked="true">');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3588-004] input[type=reset] with role="tab" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="reset" role="tab">');
		expect(violations).toStrictEqual([]);
	});

	// input[type=submit] should allow same roles as button element
	test('[wai-aria-issue-3588-005] input[type=submit] with role="menuitem" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit" role="menuitem">');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3588-006] input[type=submit] with role="checkbox" — no permitted-roles violation', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit" role="checkbox">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "aria-checked" ARIA state on the "checkbox" role',
				raw: '<input type="submit" role="checkbox">',
			},
		]);
	});

	test('[wai-aria-issue-3588-007] input[type=submit] with role="checkbox" and aria-checked is fully valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit" role="checkbox" aria-checked="false">');
		expect(violations).toStrictEqual([]);
	});

	// input[type=image] should allow button-like roles (except combobox)
	test('[wai-aria-issue-3588-008] input[type=image] with role="checkbox" — no permitted-roles violation', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="image" role="checkbox" alt="Toggle">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require the "aria-checked" ARIA state on the "checkbox" role',
				raw: '<input type="image" role="checkbox" alt="Toggle">',
			},
		]);
	});

	test('[wai-aria-issue-3588-009] input[type=image] with role="checkbox" and aria-checked is fully valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<input type="image" role="checkbox" aria-checked="false" alt="Toggle">',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3588-010] input[type=image] with role="tab" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="image" role="tab" alt="Tab">');
		expect(violations).toStrictEqual([]);
	});

	// input[type=button] with new 1.2 roles
	test('[wai-aria-issue-3588-011] input[type=button] with role="gridcell" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="button" role="gridcell" value="Cell">');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3588-012] input[type=button] with role="treeitem" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="button" role="treeitem" value="Item">');
		expect(violations).toStrictEqual([]);
	});

	// Invalid cases — should still report violations after fix
	test('[wai-aria-issue-3588-013] input[type=reset] with role="navigation" is not permitted', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="reset" role="navigation">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				message:
					'Cannot overwrite the "navigation" role to the "input" element according to ARIA in HTML specification',
				raw: 'navigation',
			},
		]);
	});

	test('[wai-aria-issue-3588-014] input[type=image] with role="combobox" is not permitted', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="image" role="combobox" alt="Combo">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				message:
					'Cannot overwrite the "combobox" role to the "input" element according to ARIA in HTML specification',
				raw: 'combobox',
			},
		]);
	});

	// Cascading fix: permitted role → correct computed role → props valid
	test('[wai-aria-issue-3588-015] input[type=submit] role=switch aria-checked — no cascade violation', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit" role="switch" aria-checked="true">');
		expect(violations).toStrictEqual([]);
	});

	// Default behavior preserved after properties removal
	test('[wai-aria-issue-3588-016] input[type=reset] without role — default behavior preserved', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="reset">');
		expect(violations).toStrictEqual([]);
	});

	test('[wai-aria-issue-3588-017] input[type=submit] without role — default behavior preserved', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit">');
		expect(violations).toStrictEqual([]);
	});

	// ARIA 1.1 boundary: roles added in 1.2 must be rejected in 1.1
	test('[wai-aria-issue-3588-018] input[type=reset] with role="gridcell" is NOT permitted in 1.1', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="reset" role="gridcell">', {
			rule: { options: { version: '1.1' } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				message:
					'Cannot overwrite the "gridcell" role to the "input" element according to ARIA in HTML specification',
				raw: 'gridcell',
			},
		]);
	});

	test('[wai-aria-issue-3588-019] input[type=image] with role="treeitem" is NOT permitted in 1.1', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="image" role="treeitem" alt="Item">', {
			rule: { options: { version: '1.1' } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				message:
					'Cannot overwrite the "treeitem" role to the "input" element according to ARIA in HTML specification',
				raw: 'treeitem',
			},
		]);
	});

	// Focusable separator with required aria-valuenow
	test('[wai-aria-issue-3588-020] input[type=submit] with role="separator" and aria-valuenow is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="submit" role="separator" aria-valuenow="50">');
		expect(violations).toStrictEqual([]);
	});
});
