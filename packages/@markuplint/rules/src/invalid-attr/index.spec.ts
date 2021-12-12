import { mlRuleTest } from 'markuplint';

import rule from './';

test('warns if specified attribute value is invalid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{ rule: true },
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

test('Type check', async () => {
	const { violations } = await mlRuleTest(rule, '<form name=""></form>', { rule: true });

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

test('complex type', async () => {
	const { violations } = await mlRuleTest(rule, '<input autocomplete="section-a section-b"/>', { rule: true });

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message:
				'The autofill named group part of the "autocomplete" attribute is duplicated (https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section)',
			raw: 'section-b',
		},
	]);
});

test('disable', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{ rule: false },
	);

	expect(violations.length).toBe(0);
});

test('the input element type case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked>', { rule: true });

	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<input type="checkBox" checked>', { rule: true });

	expect(violations2.length).toBe(0);
});

test('ancestor condition', async () => {
	expect(
		(await mlRuleTest(rule, '<picture><source media="print"></picture>', { rule: true })).violations,
	).toStrictEqual([]);

	expect((await mlRuleTest(rule, '<audio><source media="print"></audio>', { rule: true })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "media" attribute is disallowed',
			raw: 'media',
		},
	]);
});

test('custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			option: {
				attrs: {
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
			message: 'The "x-attr" attribute is unmatched with the below patterns: /[a-z]+/',
			raw: '123',
		},
	]);
});

test('custom rule: type', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			option: {
				attrs: {
					'x-attr': {
						type: 'Int',
					},
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

test('custom element', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr></custom-element>', { rule: true });

	expect(violations.length).toBe(0);
});

test('custom element and custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
		rule: true,

		nodeRule: [
			{
				tagName: 'custom-element',
				rule: {
					option: {
						attrs: {
							'any-attr': {
								type: 'Int',
							},
						},
					},
				},
			},
		],
	});

	expect(violations.length).toBe(1);
});

test('prefix attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div v-bind:title="title" :class="classes" @click="click"></div>', {
		rule: true,
	});

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
			message: 'The ":class" attribute is disallowed',
			raw: ':class',
		},
		{
			severity: 'error',
			col: 44,
			line: 1,
			message: 'The "@click" attribute is disallowed',
			raw: '@click',
		},
	]);
});

test('ignore prefix attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div v-bind:title="title" :class="classes" @click="click"></div>', {
		rule: {
			option: {
				ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
			},
		},
	});

	expect(violations.length).toBe(0);
});

test('URL attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="https://sample.com/path/to">', { rule: true });
	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<img src="//sample.com/path/to">', { rule: true });
	expect(violations2.length).toBe(0);

	const { violations: violations3 } = await mlRuleTest(rule, '<img src="//user:pass@sample.com/path/to">', {
		rule: true,
	});
	expect(violations3.length).toBe(0);

	const { violations: violations4 } = await mlRuleTest(rule, '<img src="/path/to">', { rule: true });
	expect(violations4.length).toBe(0);

	const { violations: violations5 } = await mlRuleTest(rule, '<img src="/path/to?param=value">', { rule: true });
	expect(violations5.length).toBe(0);

	const { violations: violations6 } = await mlRuleTest(rule, '<img src="/?param=value">', { rule: true });
	expect(violations6.length).toBe(0);

	const { violations: violations7 } = await mlRuleTest(rule, '<img src="?param=value">', { rule: true });
	expect(violations7.length).toBe(0);

	const { violations: violations8 } = await mlRuleTest(rule, '<img src="path/to">', { rule: true });
	expect(violations8.length).toBe(0);

	const { violations: violations9 } = await mlRuleTest(rule, '<img src="./path/to">', { rule: true });
	expect(violations9.length).toBe(0);

	const { violations: violations10 } = await mlRuleTest(rule, '<img src="../path/to">', { rule: true });
	expect(violations10.length).toBe(0);

	const { violations: violations11 } = await mlRuleTest(rule, '<img src="/path/to#hash">', { rule: true });
	expect(violations11.length).toBe(0);

	const { violations: violations12 } = await mlRuleTest(rule, '<img src="#hash">', { rule: true });
	expect(violations12.length).toBe(0);
});

test('Foreign element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
		{ rule: true },
	);

	expect(violations.length).toBe(0);
});

test('svg', async () => {
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
				{ rule: true },
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 30,
			message: 'The "cz" attribute is disallowed',
			raw: 'cz',
		},
	]);
});

test('svg', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
					<rect mask="20px
					hogehoge" />
				</svg>
				`,
				{ rule: true },
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 6,
			message:
				'The value part of the "mask" attribute expects the CSS Syntax "<mask-layer>#" (https://csstree.github.io/docs/syntax/#Property:mask)',
			raw: 'hogehoge',
		},
	]);
});

test('Pug', async () => {
	const { violations } = await mlRuleTest(rule, 'button(type=buttonType)', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
		rule: true,
	});

	expect(violations.length).toBe(0);
});

test('Vue', async () => {
	const { violations: violations1 } = await mlRuleTest(
		rule,
		'<template><button type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rule: true,
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<template><button :type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rule: true,
		},
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('Vue iterator', async () => {
	const { violations: violations1 } = await mlRuleTest(
		rule,
		'<template><ul ref="ul"><li key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: ['@markuplint/vue-spec'],
			rule: true,
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<template><ul><li v-for="item of list" :key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rule: true,
		},
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('React Component', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<Component className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rule: true,
		},
	);

	expect(violations).toStrictEqual([]);
});

test('React HTML', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<img className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rule: true,
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

test('React', async () => {
	const { violations } = await mlRuleTest(rule, '<a href={href} target={target} invalidAttr={invalidAttr} />', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		rule: true,
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

test('React with spread attribute', async () => {
	expect(
		(
			await mlRuleTest(rule, '<a target="_blank" />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: true,
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
				rule: true,
			})
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(rule, '<img invalid />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: true,
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "invalid" attribute is disallowed',
			raw: 'invalid',
		},
	]);

	expect(
		(
			await mlRuleTest(rule, '<img {...props} invalid />', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rule: true,
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message: 'The "invalid" attribute is disallowed',
			raw: 'invalid',
		},
	]);
});

test('React spec', async () => {
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
		rule: true,
	});

	const { violations: violations2 } = await mlRuleTest(rule, jsx, {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		specs: ['@markuplint/react-spec'],
		rule: true,
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

test('regexSelector', async () => {
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
			rule: true,

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
						option: {
							attrs: {
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
