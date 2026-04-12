import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[invalid-attr-invalid-001] warns if specified attribute value is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "invalid-attr" attribute is disallowed',
			raw: 'invalid-attr',
		},
		{
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The "referrerpolicy" attribute expects either "", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"',
			raw: 'invalid-value',
		},
	]);
});

test('[invalid-attr-invalid-002] Type check', async () => {
	const { violations } = await mlRuleTest(rule, '<form name=""></form>');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "name" attribute must not be empty',
			raw: '',
		},
	]);
});

test('[invalid-attr-invalid-003] Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="invalid"></div>')).violations.length).toBe(1);
});

test('[invalid-attr-invalid-004] complex type', async () => {
	const { violations } = await mlRuleTest(rule, '<input autocomplete="section-a section-b"/>');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message:
				'It includes unexpected characters. the "autocomplete" attribute expects autofill field name (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field)',
			raw: 'section-b',
		},
	]);
});

test('[invalid-attr-valid-001] disable', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{ rule: false },
	);

	expect(violations.length).toBe(0);
});

test('[invalid-attr-valid-002] global attribute', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a title="the a element"><abbr title="the abbr element">text</abbr></a>',
	);

	expect(violations).toStrictEqual([]);
});

test('[invalid-attr-valid-003] the input element type case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked>');

	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<input type="checkBox" checked>');

	expect(violations2.length).toBe(0);
});

test('[invalid-attr-invalid-005] Add allow attr', async () => {
	expect((await mlRuleTest(rule, '<div x-attr></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "x-attr" attribute is disallowed',
			raw: 'x-attr',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<div x-attr></div>', {
				rule: {
					options: {
						allowAttrs: ['x-attr'],
					},
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[invalid-attr-valid-004] Add disallow attr', async () => {
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

test('[invalid-attr-invalid-006] Add disallow attr', async () => {
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

test('[invalid-attr-invalid-007] Add disallow attr', async () => {
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

test('[invalid-attr-invalid-008] Add disallow attr', async () => {
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

test('[invalid-attr-invalid-009] Add disallow attr', async () => {
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

test('[invalid-attr-invalid-010] custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: {
					'x-attr': {
						pattern: '/[a-z]+/',
					},
				},
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expects regular expression (/[a-z]+/)',
			raw: '123',
		},
	]);
});

test('[invalid-attr-invalid-011] custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: [
					{
						name: 'x-attr',
						value: {
							pattern: '/[a-z]+/',
						},
					},
				],
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expects regular expression (/[a-z]+/)',
			raw: '123',
		},
	]);
});

test('[invalid-attr-invalid-012] custom rule: type', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: {
					'x-attr': 'Int',
				},
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 41,
			message: 'It includes unexpected characters. the "x-attr" attribute expects integer',
			raw: 'abc',
		},
	]);
});

test('[invalid-attr-valid-005] custom element', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr></custom-element>');

	expect(violations.length).toBe(0);
});

test('[invalid-attr-invalid-013] custom element and custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
		nodeRule: [
			{
				selector: 'custom-element',
				rule: {
					options: {
						allowAttrs: {
							'any-attr': 'Int',
						},
					},
				},
			},
		],
	});

	expect(violations.length).toBe(1);
});

test('[invalid-attr-invalid-014] custom element and custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
		nodeRule: [
			{
				selector: 'custom-element',
				rule: {
					options: {
						allowAttrs: [
							{
								name: 'any-attr',
								value: 'Int',
							},
						],
					},
				},
			},
		],
	});

	expect(violations.length).toBe(1);
});

test('[invalid-attr-invalid-015] prefix attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div v-bind:title="title" :class="classes" @click="click"></div>');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "v-bind:title" attribute is disallowed',
			raw: 'v-bind:title',
		},
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The ":class" attribute is disallowed. Did you mean "class"?',
			raw: ':class',
		},
		{
			severity: 'error',
			col: 44,
			line: 1,
			message: 'The "@click" attribute is disallowed. Did you mean "onclick"?',
			raw: '@click',
		},
	]);
});

test('[invalid-attr-valid-006] ignore prefix attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div v-bind:title="title" :class="classes" @click="click"></div>', {
		rule: {
			options: {
				ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
			},
		},
	});

	expect(violations.length).toBe(0);
});

test('[invalid-attr-valid-007] URL attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="https://sample.com/path/to">');
	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<img src="//sample.com/path/to">');
	expect(violations2.length).toBe(0);

	const { violations: violations3 } = await mlRuleTest(rule, '<img src="//user:pass@sample.com/path/to">');
	expect(violations3.length).toBe(0);

	const { violations: violations4 } = await mlRuleTest(rule, '<img src="/path/to">');
	expect(violations4.length).toBe(0);

	const { violations: violations5 } = await mlRuleTest(rule, '<img src="/path/to?param=value">');
	expect(violations5.length).toBe(0);

	const { violations: violations6 } = await mlRuleTest(rule, '<img src="/?param=value">');
	expect(violations6.length).toBe(0);

	const { violations: violations7 } = await mlRuleTest(rule, '<img src="?param=value">');
	expect(violations7.length).toBe(0);

	const { violations: violations8 } = await mlRuleTest(rule, '<img src="path/to">');
	expect(violations8.length).toBe(0);

	const { violations: violations9 } = await mlRuleTest(rule, '<img src="./path/to">');
	expect(violations9.length).toBe(0);

	const { violations: violations10 } = await mlRuleTest(rule, '<img src="../path/to">');
	expect(violations10.length).toBe(0);

	const { violations: violations11 } = await mlRuleTest(rule, '<img src="/path/to#hash">');
	expect(violations11.length).toBe(0);

	const { violations: violations12 } = await mlRuleTest(rule, '<img src="#hash">');
	expect(violations12.length).toBe(0);
});

test('[invalid-attr-invalid-016] Overwrite type', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
		{
			rule: {
				options: {
					allowAttrs: {
						datetime: {
							enum: ['overwrite-type'],
						},
					},
				},
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'The "datetime" attribute expects overwrite-type',
			raw: '2000-01-01',
		},
	]);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message:
				'The year part includes unexpected characters (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
			raw: 'overwrite',
		},
	]);
});

test('[invalid-attr-invalid-017] Overwrite type', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
		{
			rule: {
				options: {
					allowAttrs: [
						{
							name: 'datetime',
							value: {
								enum: ['overwrite-type'],
							},
						},
					],
				},
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'The "datetime" attribute expects overwrite-type',
			raw: '2000-01-01',
		},
	]);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message:
				'The year part includes unexpected characters (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
			raw: 'overwrite',
		},
	]);
});

test('[invalid-attr-invalid-018] custom rule: disallowed', async () => {
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

test('[invalid-attr-valid-008] Foreign element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
	);

	expect(violations.length).toBe(0);
});

test('[invalid-attr-invalid-019] noUse flag', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog tabindex="-1"></dialog>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "tabindex" attribute is disallowed',
			raw: 'tabindex="-1"',
		},
	]);
});

test('[invalid-attr-valid-009] noUse flag with allowAttrs (allowAttrs overrides noUse)', async () => {
	const { violations } = await mlRuleTest(rule, '<dialog tabindex="0"></dialog>', {
		rule: {
			options: {
				allowAttrs: [{ name: 'tabindex', value: { enum: ['-1', '0'] } }],
			},
		},
	});
	// allowAttrs intentionally overrides spec-level noUse — users can opt in.
	// Presets should use nodeRules to scope allowAttrs and avoid this.
	expect(violations).toStrictEqual([]);
});

test('[invalid-attr-invalid-020] svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" stroke="red" fill="grey">
					<circle cx="50" cy="50" cz="50" r="40" />
					<circle cx="150" cy="50" r="4" />
					<svg viewBox="0 0 10 10" x="200" width="100">
						<circle cx="5" cy="5" r="4" />
					</svg>
				</svg>
				`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 30,
			message: 'The "cz" attribute is disallowed. Did you mean "cx"?',
			raw: 'cz',
		},
	]);
});

test('[invalid-attr-invalid-021] svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
					<rect mask="20px
					hogehoge" />
				</svg>
				`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 6,
			message:
				'The value part of the "mask" attribute expects the CSS Syntax "<\'mask\'>" (https://csstree.github.io/docs/syntax/#Property:mask)',
			raw: 'hogehoge',
		},
	]);
});

test('[invalid-attr-invalid-022] svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
					<rect transform="translate(300px, 300px)" />
				</svg>
				`,
			)
		).violations,
	).toStrictEqual([]);
});

test('[invalid-attr-parser-001] Pug', async () => {
	const { violations } = await mlRuleTest(rule, 'button(type=buttonType)', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('[invalid-attr-parser-002] Pug class', async () => {
	const { violations } = await mlRuleTest(rule, 'div.className', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('[invalid-attr-parser-003] Vue', async () => {
	const { violations: violations1 } = await mlRuleTest(
		rule,
		'<template><button type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<template><button :type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('[invalid-attr-parser-004] Vue iterator', async () => {
	const { violations: violations1 } = await mlRuleTest(
		rule,
		'<template><ul ref="ul"><li key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<template><ul><li v-for="item of list" :key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('[invalid-attr-parser-005] Vue slot', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><div><slot v-bind:foo="foo">{{ foo.bar }}</slot></div></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);

	expect(violations.length).toBe(0);
});

test('[invalid-attr-parser-006] Vue (.prop shorthand)', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div .someProp="value"></div></template>', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
		specs: {
			'.*': '@markuplint/vue-spec',
		},
	});
	expect(violations.length).toBe(0);
});

test('[invalid-attr-parser-007] MDX with react-spec (className is valid via IDL resolution)', async () => {
	const { violations } = await mlRuleTest(rule, '<div className="test">text</div>\n', {
		parser: {
			'.*': '@markuplint/mdx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[invalid-attr-parser-008] React Component', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<Component className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			specs: {
				'.*': '@markuplint/react-spec',
			},
		},
	);

	expect(violations).toStrictEqual([]);
});

test('[invalid-attr-parser-009] React HTML', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<img className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			specs: {
				'.*': '@markuplint/react-spec',
			},
		},
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message: 'The "tabindex" attribute is disallowed. Did you mean "tabIndex"?',
			raw: 'tabindex',
		},
		{
			severity: 'error',
			line: 1,
			col: 71,
			message: 'The "for" attribute is disallowed',
			raw: 'htmlFor',
		},
	]);
});

test('[invalid-attr-parser-010] React', async () => {
	const { violations } = await mlRuleTest(rule, '<a href={href} target={target} invalidAttr={invalidAttr} />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "invalidAttr" attribute is disallowed',
			raw: 'invalidAttr',
		},
	]);
});

test('[invalid-attr-parser-011] React with spread attribute', async () => {
	expect(
		(
			await mlRuleTest(rule, '<a target="_blank" />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "target" attribute is disallowed',
			raw: 'target',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<a {...props} target="_blank" />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<img invalid />', {
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
			message: 'The "invalid" attribute is disallowed. Did you mean "oninvalid"?',
			raw: 'invalid',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<img {...props} invalid />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message: 'The "invalid" attribute is disallowed. Did you mean "oninvalid"?',
			raw: 'invalid',
		},
	]);
});

test('[invalid-attr-parser-012] React spec', async () => {
	const jsx = `<>
	<div value defaultValue></div>
	<input defaultChecked />
	<input type="checkbox" defaultChecked />
	<select value defaultValue></select>
	<textarea value defaultValue></textarea>
	<select value={0} defaultValue={0}></select>
	<textarea value={0} defaultValue={0}></textarea>
</>`;
	const { violations: violations1 } = await mlRuleTest(rule, jsx, {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	});

	const { violations: violations2 } = await mlRuleTest(rule, jsx, {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: {
			'.*': '@markuplint/react-spec',
		},
	});

	expect(violations1).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 7,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
		{
			severity: 'error',
			line: 2,
			col: 13,
			message: 'The "defaultValue" attribute is disallowed',
			raw: 'defaultValue',
		},
		{
			severity: 'error',
			line: 3,
			col: 9,
			message: 'The "defaultChecked" attribute is disallowed',
			raw: 'defaultChecked',
		},
		{
			severity: 'error',
			line: 4,
			col: 25,
			message: 'The "defaultChecked" attribute is disallowed',
			raw: 'defaultChecked',
		},
		{
			severity: 'error',
			line: 5,
			col: 10,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
		{
			severity: 'error',
			line: 5,
			col: 16,
			message: 'The "defaultValue" attribute is disallowed',
			raw: 'defaultValue',
		},
		{
			severity: 'error',
			line: 6,
			col: 12,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
		{
			severity: 'error',
			line: 6,
			col: 18,
			message: 'The "defaultValue" attribute is disallowed',
			raw: 'defaultValue',
		},
		{
			severity: 'error',
			line: 7,
			col: 10,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
		{
			severity: 'error',
			line: 7,
			col: 20,
			message: 'The "defaultValue" attribute is disallowed',
			raw: 'defaultValue',
		},
		{
			severity: 'error',
			line: 8,
			col: 12,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
		{
			severity: 'error',
			line: 8,
			col: 22,
			message: 'The "defaultValue" attribute is disallowed',
			raw: 'defaultValue',
		},
	]);

	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 7,
			message: 'The "value" attribute is disallowed',
			raw: 'value',
		},
		{
			severity: 'error',
			line: 2,
			col: 13,
			message: 'The "defaultValue" attribute is disallowed',
			raw: 'defaultValue',
		},
		{
			severity: 'error',
			line: 3,
			col: 9,
			message: 'The "defaultChecked" attribute is disallowed',
			raw: 'defaultChecked',
		},
	]);
});

test('[invalid-attr-parser-013] React: a custom rule and a mutable attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<a href={href} target={target} invalidAttr={invalidAttr} />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		nodeRule: [
			{
				selector: 'a',
				rule: {
					options: {
						allowAttrs: {
							href: {
								enum: ['https://markuplint.dev'],
							},
						},
					},
				},
			},
		],
	});

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "invalidAttr" attribute is disallowed',
			raw: 'invalidAttr',
		},
	]);
});

test('[invalid-attr-invalid-023] Pretenders', async () => {
	expect(
		(
			await mlRuleTest(rule, '<Image objectFit alt />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<Image objectFit alt />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				pretenders: [
					{
						selector: 'Image',
						as: {
							element: 'img',
							inheritAttrs: true,
						},
					},
				],
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<Image objectFit alt />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: {
					options: {
						allowToAddPropertiesForPretender: false,
					},
				},
				pretenders: [
					{
						selector: 'Image',
						as: {
							element: 'img',
							inheritAttrs: true,
						},
					},
				],
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "objectFit" attribute is disallowed',
			raw: 'objectFit',
		},
	]);
});

test('[invalid-attr-invalid-024] regexSelector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<picture>
	<source srcset="logo-3x.png 3x">
	<source srcset="logo@3x.png 3x">
	<source srcset="logo-2x.png 2x">
	<source srcset="logo@2x.png 2x">
	<img src="logo.png" alt="logo">
</picture>
`,
		{
			nodeRule: [
				{
					regexSelector: {
						nodeName: 'img',
						attrName: 'src',
						attrValue: '/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/',
						combination: {
							combinator: ':has(~)',
							nodeName: 'source',
						},
					},
					rule: {
						options: {
							allowAttrs: {
								srcset: {
									enum: ['{{FileName}}@2x.{{Exp}} 2x', '{{FileName}}@3x.{{Exp}} 3x'],
								},
							},
						},
					},
				},
			],
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-3x.png 3x',
		},
		{
			severity: 'error',
			line: 4,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-2x.png 2x',
		},
	]);
});

test('[invalid-attr-invalid-025] regexSelector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<picture>
	<source srcset="logo-3x.png 3x">
	<source srcset="logo@3x.png 3x">
	<source srcset="logo-2x.png 2x">
	<source srcset="logo@2x.png 2x">
	<img src="logo.png" alt="logo">
</picture>
`,
		{
			nodeRule: [
				{
					regexSelector: {
						nodeName: 'img',
						attrName: 'src',
						attrValue: '/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/',
						combination: {
							combinator: ':has(~)',
							nodeName: 'source',
						},
					},
					rule: {
						options: {
							allowAttrs: [
								{
									name: 'srcset',
									value: {
										enum: ['{{FileName}}@2x.{{Exp}} 2x', '{{FileName}}@3x.{{Exp}} 3x'],
									},
								},
							],
						},
					},
				},
			],
		},
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-3x.png 3x',
		},
		{
			severity: 'error',
			line: 4,
			col: 18,
			message: 'The "srcset" attribute expects either "logo@2x.png 2x", "logo@3x.png 3x"',
			raw: 'logo-2x.png 2x',
		},
	]);
});

test('[invalid-attr-valid-010] Booleanish', async () => {
	expect((await mlRuleTest(rule, '<div contenteditable></div>')).violations).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<div contentEditable></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);

	// No warning because checking by the wai-aria rule
	expect(
		(
			await mlRuleTest(rule, '<div aria-hidden></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

describe('contentEditable "inherit" (Issue #525)', () => {
	test('[invalid-attr-invalid-026] HTML: contenteditable="inherit" is invalid (no spec override)', async () => {
		const { violations } = await mlRuleTest(rule, '<div contenteditable="inherit"></div>');
		expect(violations.length).toBe(1);
		expect(violations[0].raw).toBe('inherit');
		expect(violations[0].message).toMatch(/contenteditable/);
	});

	test('[invalid-attr-parser-014] React: contentEditable="inherit" is valid via react-spec override', async () => {
		const { violations } = await mlRuleTest(rule, '<div contentEditable="inherit"></div>', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			specs: {
				'.*': '@markuplint/react-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-parser-015] React: contentEditable="banana" is still invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<div contentEditable="banana"></div>', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			specs: {
				'.*': '@markuplint/react-spec',
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0].raw).toBe('banana');
		expect(violations[0].message).toMatch(/contenteditable/);
	});

	test('[invalid-attr-parser-016] Svelte: contentEditable="inherit" is valid via svelte-spec override', async () => {
		const { violations } = await mlRuleTest(rule, '<div contentEditable="inherit"></div>', {
			parser: {
				'.*': '@markuplint/svelte-parser',
			},
			specs: {
				'.*': '@markuplint/svelte-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-parser-017] Svelte: contenteditable="inherit" is valid (lowercase content attribute name)', async () => {
		const { violations } = await mlRuleTest(rule, '<div contenteditable="inherit"></div>', {
			parser: {
				'.*': '@markuplint/svelte-parser',
			},
			specs: {
				'.*': '@markuplint/svelte-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Svelte acceptedAttrNames: both (Issue #525)', () => {
	test('[invalid-attr-issue-525-001] Svelte: class="foo" is valid (content attribute name accepted)', async () => {
		const { violations } = await mlRuleTest(rule, '<div class="foo"></div>', {
			parser: {
				'.*': '@markuplint/svelte-parser',
			},
			specs: {
				'.*': '@markuplint/svelte-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-525-002] Svelte: className="foo" is valid (IDL attribute name accepted in both mode)', async () => {
		const { violations } = await mlRuleTest(rule, '<div className="foo"></div>', {
			parser: {
				'.*': '@markuplint/svelte-parser',
			},
			specs: {
				'.*': '@markuplint/svelte-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-525-003] Svelte: tabIndex is valid (IDL name accepted in both mode)', async () => {
		const { violations } = await mlRuleTest(rule, '<div tabIndex="0"></div>', {
			parser: {
				'.*': '@markuplint/svelte-parser',
			},
			specs: {
				'.*': '@markuplint/svelte-spec',
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

test('[invalid-attr-valid-011] WAI-Adapt', async () => {
	expect((await mlRuleTest(rule, '<p adapt-simplification="critical"></p>')).violations).toStrictEqual([]);

	expect(
		(await mlRuleTest(rule, '<span adapt-easylang="90% of the time this happens"></span>', {})).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(
				rule,
				`
				<label for="address" adapt-symbol="14885">Your Principal Residence</label>
				<input type="text" id="address" adapt-purpose="street-address">
			`,
			)
		).violations,
	).toStrictEqual([]);
});

test('[invalid-attr-valid-012] Multiple Type', async () => {
	expect((await mlRuleTest(rule, '<button command="toggle-popover"></button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<button command="--custom"></button>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<button command="invalid"></button>')).violations).toStrictEqual([
		{
			severity: 'error',
			col: 18,
			line: 1,
			message:
				'The "command" attribute expects either "toggle-popover", "show-popover", "hide-popover", "close", "request-close", "show-modal". Or, the "command" attribute expects the custom command format. Did you mean "--invalid"? (https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command)',
			raw: 'invalid',
		},
	]);
});

test('[invalid-attr-valid-013] The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<a as="span"></a>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "as" attribute is disallowed. Did you mean "is"?',
			raw: 'as',
		},
	]);
	expect((await mlRuleTest(rule, '<x-link as="a" foo></x-link>')).violations).toStrictEqual([]);
});

test('[invalid-attr-valid-014] CSS Functions', async () => {
	expect((await mlRuleTest(rule, '<div style="prop: var(--x)"></div>')).violations).toStrictEqual([]);
});

describe('Issues', () => {
	test('[invalid-attr-issue-553] #553', async () => {
		expect(
			(await mlRuleTest(rule, '<link rel="preload" imagesrcset="path/to" as="image" imagesizes="100vw" />', {}))
				.violations,
		).toStrictEqual([]);

		expect(
			(
				await mlRuleTest(rule, '<link rel="preload" imageSrcSet={url} as="image" imageSizes="100vw" />', {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					specs: {
						'.*': '@markuplint/react-spec',
					},
				})
			).violations,
		).toStrictEqual([]);
	});

	// https://github.com/markuplint/markuplint/issues/1987
	test('[invalid-attr-issue-1987] #1987', async () => {
		// Valid preload destinations
		expect((await mlRuleTest(rule, '<link rel="preload" as="fetch" href="/api" />')).violations).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<link rel="preload" as="font" href="/font.woff2" />')).violations,
		).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<link rel="preload" as="script" href="/app.js" />')).violations).toStrictEqual(
			[],
		);
		expect((await mlRuleTest(rule, '<link rel="preload" as="style" href="/app.css" />')).violations).toStrictEqual(
			[],
		);
		expect((await mlRuleTest(rule, '<link rel="preload" as="track" href="/sub.vtt" />')).violations).toStrictEqual(
			[],
		);

		// Valid module preload destinations
		expect(
			(await mlRuleTest(rule, '<link rel="modulepreload" as="script" href="/mod.js" />')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<link rel="modulepreload" as="worker" href="/worker.js" />')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<link rel="modulepreload" as="json" href="/data.json" />')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<link rel="modulepreload" as="style" href="/mod.css" />')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<link rel="modulepreload" as="audioworklet" href="/audio.js" />')).violations,
		).toStrictEqual([]);

		// Invalid: values not valid for preload (condition-specific enum after #3189)
		expect(
			(await mlRuleTest(rule, '<link rel="preload" as="audio" href="/audio.mp3" />')).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
				raw: 'audio',
			},
		]);
		expect(
			(await mlRuleTest(rule, '<link rel="preload" as="video" href="/video.mp4" />')).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
				raw: 'video',
			},
		]);
		expect((await mlRuleTest(rule, '<link rel="preload" as="document" href="/page" />')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'The "as" attribute expects either "fetch", "font", "image", "script", "style", "track"',
				raw: 'document',
			},
		]);
	});

	test('[invalid-attr-issue-564] #564', async () => {
		expect((await mlRuleTest(rule, '<div class="md:flex"></div>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<svg><rect class="md:flex"/></svg>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-678] #678', async () => {
		const vue = {
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		};

		expect(
			(await mlRuleTest(rule, '<template><div><template #header></template></div></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('[invalid-attr-issue-783] #783', async () => {
		const vue = {
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		};

		expect(
			(await mlRuleTest(rule, '<template><button @click.stop="foo"></button></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('[invalid-attr-issue-800] #800', async () => {
		const pug = {
			parser: {
				'.*': '@markuplint/pug-parser',
			},
		};

		expect(
			(
				await mlRuleTest(
					rule,
					`
ol(itemscope itemtype="https://schema.org/BreadcrumbList")
	li(itemscope itemprop="itemListElement" itemtype="https://schema.org/ListItem" data-breadcrumb="home")
		a(href="/" itemscope itemprop="item" itemtype="https://schema.org/WebPage" itemid="/")
			span(itemprop="name") Home
		meta(itemprop="position" content="1")
		span.c-nav-breadcrumb__separetor
	li(itemscope itemprop="itemListElement" itemtype="https://schema.org/ListItem")
		a(href="/first/" itemscope itemprop="item" itemtype="https://schema.org/WebPage" itemid="/first/")
			span(itemprop="name") Parent
		meta(itemprop="position" content="2")
		span.c-nav-breadcrumb__separetor
	li(itemscope itemprop="itemListElement" itemtype="https://schema.org/ListItem" data-breadcrumb="current")
		a(href="/first/about" itemscope itemprop="item" itemtype="https://schema.org/WebPage" itemid="/first/about")
			span(itemprop="name") Current
		meta(itemprop="position" content="3")
			`,
					pug,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[invalid-attr-issue-1078] #1078', async () => {
		expect(
			(await mlRuleTest(rule, '<script src="foo.js" referrerpolicy="no-referrer"></script>')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<img src="foo.png" referrerpolicy="no-referrer"></img>')).violations,
		).toStrictEqual([]);
	});

	test('[invalid-attr-issue-1357] #1357', async () => {
		expect(
			(await mlRuleTest(rule, '<svg><rect transform="translate(300 300) rotate(180)" /></svg>')).violations,
		).toStrictEqual([]);
	});

	test('[invalid-attr-issue-2455] #2455', async () => {
		const sourceCode = `<picture>
  <source src="path/to" media="(query: value)">
  <source srcset="path/to" media="(query: value)">
  <source media="(query: value)">
  <img src="fallback" alt="text">
</picture>
<video>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</video>
<audio>
  <source src="path/to">
  <source srcset="path/to">
  <source>
</audio>`;
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 11,
				message: 'The "src" attribute is disallowed',
				raw: 'src',
			},
			{
				severity: 'error',
				line: 9,
				col: 11,
				message: 'The "srcset" attribute is disallowed',
				raw: 'srcset',
			},
			{
				severity: 'error',
				line: 14,
				col: 11,
				message: 'The "srcset" attribute is disallowed',
				raw: 'srcset',
			},
		]);
	});
});

describe('button command attribute', () => {
	test('[invalid-attr-valid-015] command="request-close" is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<dialog id="d"><button command="request-close" commandfor="d">Close</button></dialog>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-valid-016] command="close" is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<dialog id="d"><button command="close" commandfor="d">Close</button></dialog>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-invalid-027] command="invalid-value" is invalid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<dialog id="d"><button command="invalid-value" commandfor="d">Close</button></dialog>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 33,
				message:
					'The "command" attribute expects either "toggle-popover", "show-popover", "hide-popover", "close", "request-close", "show-modal". Or, the "command" attribute expects the custom command format. Did you mean "--invalid-value"? (https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command)',
				raw: 'invalid-value',
			},
		]);
	});
});

describe('Attribute name suggestion (#1487)', () => {
	test('[invalid-attr-issue-1487-001] suggests similar attribute name for typo', async () => {
		const { violations } = await mlRuleTest(rule, '<input nama="test">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 8,
				message: 'The "nama" attribute is disallowed. Did you mean "name"?',
				raw: 'nama',
			},
		]);
	});

	// cspell:ignore clss
	test('[invalid-attr-issue-1487-002] suggests similar attribute name for class typo', async () => {
		const { violations } = await mlRuleTest(rule, '<div clss="test"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "clss" attribute is disallowed. Did you mean "class"?',
				raw: 'clss',
			},
		]);
	});

	test('[invalid-attr-issue-1487-003] no suggestion for completely unrelated attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<div xyz="test"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "xyz" attribute is disallowed',
				raw: 'xyz',
			},
		]);
	});
});

describe('headingoffset and headingreset attributes', () => {
	test('[invalid-attr-valid-017] headingoffset with valid value is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<section headingoffset="1"><h2>Title</h2></section>');
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-valid-018] headingoffset="0" is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<div headingoffset="0"><h1>Title</h1></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-valid-019] headingoffset="8" is valid (max)', async () => {
		const { violations } = await mlRuleTest(rule, '<div headingoffset="8"><h1>Title</h1></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-invalid-028] headingoffset with non-integer value is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<div headingoffset="abc"><h1>Title</h1></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				message:
					'It includes unexpected characters. the "headingoffset" attribute expects integer greater than or equal to 0 less than or equal to 8',
				raw: 'abc',
			},
		]);
	});

	test('[invalid-attr-valid-020] headingreset is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<div headingreset><h1>Title</h1></div>');
		expect(violations).toStrictEqual([]);
	});
});

// https://github.com/markuplint/markuplint/issues/716
// https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
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

	test('[invalid-attr-issue-716-001] violation: user-scalable=no', async () => {
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

	test('[invalid-attr-issue-716-002] violation: user-scalable=0', async () => {
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

	test('[invalid-attr-issue-716-003] violation: user-scalable=NO (case insensitive)', async () => {
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

	test('[invalid-attr-issue-716-004] violation: spaces around = sign', async () => {
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

	test('[invalid-attr-issue-716-005] no violation: normal viewport', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, initial-scale=1">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-716-006] no violation: user-scalable=yes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable=yes">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-716-007] no violation: user-scalable=1', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="viewport" content="width=device-width, user-scalable=1">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-716-008] no violation: non-viewport meta is not affected', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<meta name="description" content="user-scalable=no">',
			viewportConfig,
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('focusgroup attribute (#3384)', () => {
	test('[invalid-attr-issue-3384-001] focusgroup with valid behavior keyword', async () => {
		expect((await mlRuleTest(rule, '<div focusgroup="toolbar"></div>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3384-002] focusgroup with multiple valid tokens', async () => {
		expect((await mlRuleTest(rule, '<div focusgroup="tablist inline wrap"></div>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3384-003] focusgroup with all valid tokens', async () => {
		expect((await mlRuleTest(rule, '<ul focusgroup="menu block nowrap nomemory"></ul>')).violations).toStrictEqual(
			[],
		);
	});

	test('[invalid-attr-issue-3384-004] focusgroup with invalid token', async () => {
		const { violations } = await mlRuleTest(rule, '<div focusgroup="invalid"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 18,
				message: expect.stringContaining('"focusgroup"'),
				raw: 'invalid',
			},
		]);
	});

	test('[invalid-attr-issue-3384-005] focusgroup with valid and invalid tokens mixed', async () => {
		const { violations } = await mlRuleTest(rule, '<div focusgroup="toolbar invalidmod"></div>');
		expect(violations.length).toBe(1);
		expect(violations[0]!.raw).toBe('invalidmod');
	});

	test('[invalid-attr-issue-3384-006] focusgroup="none" is valid', async () => {
		expect((await mlRuleTest(rule, '<li focusgroup="none"></li>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3384-007] focusgroup is case-insensitive', async () => {
		expect((await mlRuleTest(rule, '<div focusgroup="TOOLBAR"></div>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<div focusgroup="Menu Inline Wrap"></div>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3384-008] focusgroup rejects duplicate tokens', async () => {
		const { violations } = await mlRuleTest(rule, '<div focusgroup="toolbar toolbar"></div>');
		expect(violations.length).toBeGreaterThanOrEqual(1);
	});

	test('[invalid-attr-issue-3384-009] focusgroup with empty value is valid (zero tokens allowed)', async () => {
		expect((await mlRuleTest(rule, '<div focusgroup=""></div>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3384-010] focusgroupstart boolean attribute is valid', async () => {
		expect((await mlRuleTest(rule, '<button focusgroupstart></button>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3384-011] focusgroup on any element (global attribute)', async () => {
		expect((await mlRuleTest(rule, '<nav focusgroup="menubar"></nav>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<span focusgroupstart></span>')).violations).toStrictEqual([]);
	});
});

test('[invalid-attr-valid-021] empty lang attribute is valid (language set to unknown)', async () => {
	expect((await mlRuleTest(rule, '<html lang=""></html>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<html lang></html>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div lang=""></div>')).violations).toStrictEqual([]);
});

test('[invalid-attr-invalid-029] script type="speculationrules" is valid', async () => {
	expect(
		(await mlRuleTest(rule, '<script type="speculationrules">{"prerender":[{"urls":["/page"]}]}</script>'))
			.violations,
	).toStrictEqual([]);
});

describe('script conditional attributes (#3631)', () => {
	test('[invalid-attr-issue-3631-001] importmap must not have src', async () => {
		const { violations } = await mlRuleTest(rule, '<script type="importmap" src="map.json"></script>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "src" attribute is disallowed',
				raw: 'src',
			},
		]);
	});

	test('[invalid-attr-issue-3631-002] speculationrules must not have src', async () => {
		const { violations } = await mlRuleTest(rule, '<script type="speculationrules" src="rules.json"></script>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 33,
				message: 'The "src" attribute is disallowed',
				raw: 'src',
			},
		]);
	});

	test('[invalid-attr-issue-3631-003] importmap must not have async', async () => {
		const { violations } = await mlRuleTest(rule, '<script type="importmap" async></script>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "async" attribute is disallowed',
				raw: 'async',
			},
		]);
	});

	test('[invalid-attr-issue-3631-004] importmap must not have defer', async () => {
		const { violations } = await mlRuleTest(rule, '<script type="importmap" defer></script>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "defer" attribute is disallowed',
				raw: 'defer',
			},
		]);
	});

	test('[invalid-attr-issue-3631-005] importmap must not have nomodule', async () => {
		const { violations } = await mlRuleTest(rule, '<script type="importmap" nomodule></script>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "nomodule" attribute is disallowed',
				raw: 'nomodule',
			},
		]);
	});

	test('[invalid-attr-issue-3631-006] module with defer is not disallowed (handled by ineffective-attr)', async () => {
		// defer on module scripts is ineffective, not disallowed
		expect((await mlRuleTest(rule, '<script type="module" src="m.js" defer></script>')).violations).toStrictEqual(
			[],
		);
	});

	test('[invalid-attr-issue-3631-007] charset requires src', async () => {
		const { violations } = await mlRuleTest(rule, '<script charset="utf-8">x</script>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "charset" attribute is disallowed',
				raw: 'charset',
			},
		]);
	});

	test('[invalid-attr-issue-3631-008] valid: module with async', async () => {
		expect((await mlRuleTest(rule, '<script type="module" async>x</script>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3631-009] valid: classic with src and defer', async () => {
		expect((await mlRuleTest(rule, '<script src="app.js" defer></script>')).violations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3631-010] valid: classic with src and async', async () => {
		expect((await mlRuleTest(rule, '<script src="app.js" async></script>')).violations).toStrictEqual([]);
	});
});

describe('srcset validation (#3599)', () => {
	test('[invalid-attr-issue-3599-001] srcset rejects zero width descriptor', async () => {
		const { violations } = await mlRuleTest(rule, '<img srcset="x 0w" sizes="100vw" src=x alt=x>');
		expect(violations.length).toBeGreaterThan(0);
	});

	test('[invalid-attr-issue-3599-002] srcset rejects zero density descriptor', async () => {
		const { violations } = await mlRuleTest(rule, '<img srcset="x 0x" src=x alt=x>');
		expect(violations.length).toBeGreaterThan(0);
	});

	test('[invalid-attr-issue-3599-003] srcset accepts valid width descriptor', async () => {
		expect((await mlRuleTest(rule, '<img srcset="x 100w" sizes="100vw" src=x alt=x>')).violations).toStrictEqual(
			[],
		);
	});
});

describe('integrity SRI hash validation (#3626)', () => {
	test('[invalid-attr-issue-3626-001] integrity rejects md5 hash', async () => {
		const { violations } = await mlRuleTest(rule, '<script src="x" integrity="md5-abc123"></script>');
		expect(violations.length).toBeGreaterThan(0);
	});

	test('[invalid-attr-issue-3626-002] integrity accepts sha256 hash', async () => {
		expect(
			(await mlRuleTest(rule, '<script src="x" integrity="sha256-abc123"></script>')).violations,
		).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3639-001] is attribute on autonomous custom element is disallowed', async () => {
		const { violations } = await mlRuleTest(rule, '<my-element is="my-other"></my-element>');
		expect(violations).toStrictEqual([
			expect.objectContaining({
				severity: 'error',
				raw: 'is',
				message: 'The "is" attribute must not be specified on an autonomous custom element',
			}),
		]);
	});

	test('[invalid-attr-issue-3639-002] is attribute on built-in element is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<button is="fancy-button">Click</button>');
		const isViolations = violations.filter(v => v.message?.includes('"is"'));
		expect(isViolations).toStrictEqual([]);
	});

	test('[invalid-attr-issue-3639-003] autonomous custom element without is attribute is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<my-element data-foo="bar"></my-element>');
		const isViolations = violations.filter(v => v.message?.includes('"is"'));
		expect(isViolations).toStrictEqual([]);
	});
});

/*
 * #3598 — input value validation based on type attribute.
 * ConditionalAttributeType[] in spec.input.jsonc activates type-dependent
 * value checking via the resolution logic in isValidAttr().
 */
describe('#3598 input value validation', () => {
	test('[invalid-attr-issue-3598-001] input[type=color] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="color" value="red">');
		const valueViolation = violations.find(v => v.raw === 'red');
		expect(valueViolation).toBeDefined();
		expect(valueViolation!.message).toContain('simple color');
	});

	test('[invalid-attr-issue-3598-002] input[type=color] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="color" value="#ff0000">');
		expect(violations.some(v => v.raw === '#ff0000')).toBe(false);
	});

	test('[invalid-attr-issue-3598-003] input[type=url] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="url" value="http://example.com/path with space">');
		expect(violations.some(v => v.raw === 'http://example.com/path with space')).toBe(true);
	});

	test('[invalid-attr-issue-3598-004] input[type=url] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="url" value="https://example.com">');
		expect(violations.some(v => v.raw === 'https://example.com')).toBe(false);
	});

	test('[invalid-attr-issue-3598-005] input[type=number] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="number" value="abc">');
		expect(violations.some(v => v.raw === 'abc')).toBe(true);
	});

	test('[invalid-attr-issue-3598-006] input[type=number] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="number" value="42">');
		expect(violations.some(v => v.raw === '42')).toBe(false);
	});

	test('[invalid-attr-issue-3598-007] input[type=text] value is not validated (Any fallback)', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text" value="anything goes">');
		expect(violations.some(v => v.raw === 'anything goes')).toBe(false);
	});

	test('[invalid-attr-issue-3598-008] input without type: value is not validated (Any fallback)', async () => {
		const { violations } = await mlRuleTest(rule, '<input value="anything">');
		expect(violations.some(v => v.raw === 'anything')).toBe(false);
	});

	test('[invalid-attr-issue-3598-009] input[type=email] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="email" value="not-an-email">');
		expect(violations.some(v => v.raw === 'not-an-email')).toBe(true);
	});

	test('[invalid-attr-issue-3598-010] input[type=email] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="email" value="user@example.com">');
		expect(violations.some(v => v.raw === 'user@example.com')).toBe(false);
	});

	test('[invalid-attr-issue-3598-011] input[type=date] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="date" value="2024/01/15">');
		expect(violations.some(v => v.raw === '2024/01/15')).toBe(true);
	});

	test('[invalid-attr-issue-3598-012] input[type=date] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="date" value="2024-01-15">');
		expect(violations.some(v => v.raw === '2024-01-15')).toBe(false);
	});

	test('[invalid-attr-issue-3598-013] input[type=range] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="range" value="50">');
		expect(violations.some(v => v.raw === '50')).toBe(false);
	});

	test('[invalid-attr-issue-3598-014] input[type=range] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="range" value="abc">');
		expect(violations.some(v => v.raw === 'abc')).toBe(true);
	});

	test('[invalid-attr-issue-3598-015] input[type=time] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="time" value="12:30">');
		expect(violations.some(v => v.raw === '12:30')).toBe(false);
	});

	test('[invalid-attr-issue-3598-016] input[type=time] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="time" value="25:99">');
		// Token-based checker reports the first invalid part ("25"), not the whole value.
		expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
	});

	test('[invalid-attr-issue-3598-017] input[type=month] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="month" value="2024-01">');
		expect(violations.some(v => v.raw === '2024-01')).toBe(false);
	});

	test('[invalid-attr-issue-3598-018] input[type=month] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="month" value="2024-13">');
		expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
	});

	test('[invalid-attr-issue-3598-019] input[type=week] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="week" value="2024-W03">');
		expect(violations.some(v => v.raw === '2024-W03')).toBe(false);
	});

	test('[invalid-attr-issue-3598-020] input[type=week] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="week" value="2024-03">');
		expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
	});

	test('[invalid-attr-issue-3598-021] input[type=datetime-local] with valid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="datetime-local" value="2024-01-15T12:30">');
		expect(violations.some(v => v.raw === '2024-01-15T12:30')).toBe(false);
	});

	test('[invalid-attr-issue-3598-022] input[type=datetime-local] with invalid value', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="datetime-local" value="2024-01-15">');
		expect(violations.some(v => v.message.includes('"value"'))).toBe(true);
	});
});

/*
 * #3189 — link[as] condition-specific enum values.
 * The `as` attribute has different valid values depending on `rel`:
 * - rel=preload → fetch, font, image, script, style, track
 * - rel=modulepreload → json, style, audioworklet, paintworklet, script,
 *   serviceworker, sharedworker, worker
 */
describe('#3189 link[as] conditional enum', () => {
	test('[invalid-attr-issue-3189-001] rel=preload with valid as value', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a.js" as="script">');
		expect(violations.some(v => v.raw === 'script')).toBe(false);
	});

	test('[invalid-attr-issue-3189-002] rel=preload with invalid as value (json is modulepreload-only)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a.json" as="json">');
		expect(violations.some(v => v.raw === 'json')).toBe(true);
	});

	test('[invalid-attr-issue-3189-003] rel=modulepreload with valid as value', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.js" as="script">');
		expect(violations.some(v => v.raw === 'script')).toBe(false);
	});

	test('[invalid-attr-issue-3189-004] rel=modulepreload with valid as=json', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.json" as="json">');
		expect(violations.some(v => v.raw === 'json')).toBe(false);
	});

	test('[invalid-attr-issue-3189-005] rel=modulepreload with invalid as value (track is preload-only)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="modulepreload" href="/a.vtt" as="track">');
		expect(violations.some(v => v.raw === 'track')).toBe(true);
	});

	test('[invalid-attr-issue-3189-006] rel=preload with all valid preload destinations', async () => {
		for (const dest of ['fetch', 'font', 'image', 'script', 'style', 'track']) {
			const { violations } = await mlRuleTest(rule, `<link rel="preload" href="/a" as="${dest}">`);
			expect(violations.some(v => v.raw === dest)).toBe(false);
		}
	});

	test('[invalid-attr-issue-3189-007] rel=modulepreload with all valid module destinations', async () => {
		for (const dest of [
			'json',
			'style',
			'audioworklet',
			'paintworklet',
			'script',
			'serviceworker',
			'sharedworker',
			'worker',
		]) {
			const { violations } = await mlRuleTest(rule, `<link rel="modulepreload" href="/a" as="${dest}">`);
			expect(violations.some(v => v.raw === dest)).toBe(false);
		}
	});

	test('[invalid-attr-issue-3189-008] rel=preload with completely bogus as value', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="preload" href="/a" as="bogus">');
		expect(violations.some(v => v.raw === 'bogus')).toBe(true);
	});

	test('[invalid-attr-issue-3189-009] no rel: as attribute is disallowed (condition check)', async () => {
		const { violations } = await mlRuleTest(rule, '<link href="/a.css" as="style">');
		// `as` has condition=["[rel='preload' i]","[rel='modulepreload' i]"],
		// so without rel=preload/modulepreload, the attribute itself is disallowed.
		expect(violations.some(v => v.message.includes('"as"'))).toBe(true);
	});
});
