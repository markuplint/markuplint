import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('warns if specified attribute value is invalid', async () => {
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

test('Type check', async () => {
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

test('Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="invalid"></div>')).violations.length).toBe(1);
});

test('complex type', async () => {
	const { violations } = await mlRuleTest(rule, '<input autocomplete="section-a section-b"/>');

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

test('global attribute', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a title="the a element"><abbr title="the abbr element">text</abbr></a>',
	);

	expect(violations).toStrictEqual([]);
});

test('the input element type case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked>');

	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlRuleTest(rule, '<input type="checkBox" checked>');

	expect(violations2.length).toBe(0);
});

test.skip('ancestor condition', async () => {
	// TODO: Find instead of test
});

test('Add allow attr', async () => {
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

test('Add disallow attr', async () => {
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

test('Add disallow attr', async () => {
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

test('Add disallow attr', async () => {
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

test('Add disallow attr', async () => {
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

test('Add disallow attr', async () => {
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

test('custom rule', async () => {
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
			message: 'The "x-attr" attribute is unmatched with the below patterns: /[a-z]+/',
			raw: '123',
		},
	]);
});

test('custom rule', async () => {
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
			message: 'The "x-attr" attribute is unmatched with the below patterns: /[a-z]+/',
			raw: '123',
		},
	]);
});

test('custom rule: type', async () => {
	const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
		rule: {
			options: {
				allowAttrs: {
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
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr></custom-element>');

	expect(violations.length).toBe(0);
});

test('custom element and custom rule', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
		nodeRule: [
			{
				selector: 'custom-element',
				rule: {
					options: {
						allowAttrs: {
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

test('custom element and custom rule', async () => {
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

test('prefix attribute', async () => {
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
			options: {
				ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
			},
		},
	});

	expect(violations.length).toBe(0);
});

test('URL attribute', async () => {
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

test('Overwrite type', async () => {
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

test('Overwrite type', async () => {
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

test('custom rule: disallowed', async () => {
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

test('Foreign element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
	);

	expect(violations.length).toBe(0);
});

test('noUse flag', async () => {
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

test('svg', async () => {
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

test('Pug', async () => {
	const { violations } = await mlRuleTest(rule, 'button(type=buttonType)', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('Pug class', async () => {
	const { violations } = await mlRuleTest(rule, 'div.className', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
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
		},
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<template><button :type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
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

test('Vue slot', async () => {
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

test('React Component', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<Component className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
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

test('React: a custom rule and a mutable attribute', async () => {
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

test('Pretenders', async () => {
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

test('Booleanish', async () => {
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

test('WAI-Adapt', async () => {
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

describe('Deprecated options', () => {
	test('custom rule', async () => {
		const { violations } = await mlRuleTest(rule, '<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>', {
			rule: {
				options: {
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
				options: {
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

	test('custom element and custom rule', async () => {
		const { violations } = await mlRuleTest(rule, '<custom-element any-attr="any-string"></custom-element>', {
			nodeRule: [
				{
					selector: 'custom-element',
					rule: {
						options: {
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

	test('Overwrite type', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<time datetime="overwrite-type"></time><time datetime="2000-01-01"></time>',
			{
				rule: {
					options: {
						attrs: {
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

	test('custom rule: disallowed', async () => {
		const { violations } = await mlRuleTest(rule, '<a onclick="fn()"></>', {
			rule: {
				options: {
					attrs: {
						onclick: {
							disallowed: true,
						},
					},
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

	test('React: a custom rule and a mutable attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<a href={href} target={target} invalidAttr={invalidAttr} />', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			nodeRule: [
				{
					selector: 'a',
					rule: {
						options: {
							attrs: {
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

	test('The `as` attribute', async () => {
		expect((await mlRuleTest(rule, '<a as="span"></a>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				message: 'The "as" attribute is disallowed',
				raw: 'as',
			},
		]);
		expect((await mlRuleTest(rule, '<x-link as="a" foo></x-link>')).violations).toStrictEqual([]);
	});
});

describe('Issues', () => {
	test('#553', async () => {
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
				})
			).violations,
		).toStrictEqual([]);
	});

	test('#564', async () => {
		expect((await mlRuleTest(rule, '<div class="md:flex"></div>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<svg><rect class="md:flex"/></svg>')).violations).toStrictEqual([]);
	});

	test('#678', async () => {
		const vue = {
			parser: {
				'.*': '@markuplint/vue-parser',
			},
		};

		expect(
			(await mlRuleTest(rule, '<template><div><template #header></template></div></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('#783', async () => {
		const vue = {
			parser: {
				'.*': '@markuplint/vue-parser',
			},
		};

		expect(
			(await mlRuleTest(rule, '<template><button @click.stop="foo"></button></template>', vue)).violations,
		).toStrictEqual([]);
	});

	test('#800', async () => {
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

	test('#1078', async () => {
		expect(
			(await mlRuleTest(rule, '<script src="foo.js" referrerpolicy="no-referrer"></script>')).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<img src="foo.png" referrerpolicy="no-referrer"></img>')).violations,
		).toStrictEqual([]);
	});

	test('#1357', async () => {
		expect(
			(await mlRuleTest(rule, '<svg><rect transform="translate(300 300) rotate(180)" /></svg>')).violations,
		).toStrictEqual([]);
	});
});
