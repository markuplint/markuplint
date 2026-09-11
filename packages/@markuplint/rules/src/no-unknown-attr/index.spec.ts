import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unknown-attr-valid-001] global attribute', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a title="the a element"><abbr title="the abbr element">text</abbr></a>',
	);

	expect(violations).toStrictEqual([]);
});

test('[no-unknown-attr-invalid-001] Add allow attr', async () => {
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

test('[no-unknown-attr-valid-002] custom element', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr></custom-element>');

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-invalid-002] prefix attribute', async () => {
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

test('[no-unknown-attr-valid-003] ignore prefix attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div v-bind:title="title" :class="classes" @click="click"></div>', {
		rule: {
			options: {
				ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
			},
		},
	});

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-valid-004] Foreign element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
	);

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-invalid-003] svg', async () => {
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

test('[no-unknown-attr-parser-001] Pug', async () => {
	const { violations } = await mlRuleTest(rule, 'button(type=buttonType)', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-parser-002] Pug class', async () => {
	const { violations } = await mlRuleTest(rule, 'div.className', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-parser-003] Vue slot', async () => {
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

test('[no-unknown-attr-parser-004] Vue (.prop shorthand)', async () => {
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

test('[no-unknown-attr-parser-005] MDX with react-spec (className is valid via IDL resolution)', async () => {
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

test('[no-unknown-attr-parser-006] React Component', async () => {
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

test('[no-unknown-attr-parser-007] React HTML', async () => {
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

test('[no-unknown-attr-parser-008] React', async () => {
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

test('[no-unknown-attr-parser-009] React: a custom rule and a mutable attribute', async () => {
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

test('[no-unknown-attr-invalid-004] Pretenders', async () => {
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

test('[no-unknown-attr-issue-525-001] Svelte: class="foo" is valid (content attribute name accepted)', async () => {
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

test('[no-unknown-attr-issue-525-002] Svelte: className="foo" is valid (IDL attribute name accepted in both mode)', async () => {
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

test('[no-unknown-attr-issue-525-003] Svelte: tabIndex is valid (IDL name accepted in both mode)', async () => {
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

test('[no-unknown-attr-valid-005] WAI-Adapt', async () => {
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

test('[no-unknown-attr-valid-006] The `as` attribute', async () => {
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

test('[no-unknown-attr-issue-553] #553', async () => {
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

test('[no-unknown-attr-issue-564] #564', async () => {
	expect((await mlRuleTest(rule, '<div class="md:flex"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<svg><rect class="md:flex"/></svg>')).violations).toStrictEqual([]);
});

test('[no-unknown-attr-issue-678] #678', async () => {
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

test('[no-unknown-attr-issue-783] #783', async () => {
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

test('[no-unknown-attr-issue-800] #800', async () => {
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

test('[no-unknown-attr-issue-1487-001] suggests similar attribute name for typo', async () => {
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
test('[no-unknown-attr-issue-1487-002] suggests similar attribute name for class typo', async () => {
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

test('[no-unknown-attr-issue-1487-003] no suggestion for completely unrelated attribute', async () => {
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

test('[no-unknown-attr-invalid-005] a completely unknown attribute name is disallowed', async () => {
	// Split off invalid-attr's original combined test (an unknown attribute
	// name plus an invalid attribute value in the same fixture) — the value
	// half lives in no-invalid-attr-value's sibling test.
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
	]);
});

test('[no-unknown-attr-parser-010] React with spread attribute: unknown-name half', async () => {
	// Split off invalid-attr's original combined test — the condition-based
	// "target requires href" half lives in no-disallowed-attr's sibling test.
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

test('[no-unknown-attr-parser-011] React spec: unknown-name half of the controlled-component check', async () => {
	// Split off invalid-attr's original combined test. Without react-spec,
	// `value`/`defaultValue`/`defaultChecked` are unrecognized on every
	// element that appears here — none of them are native HTML attributes on
	// div/input/select/textarea. With react-spec, only the two on the bare
	// `<div>` remain unrecognized; the input/select/textarea combinations
	// become either valid or (for the first `<input defaultChecked />`)
	// react-spec's own noUse — see no-disallowed-attr's sibling test for that
	// half.
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
	]);
});

test('[no-unknown-attr-issue-3803] base rule still flags unknown attributes on meta[property]', async () => {
	// The nodeRule extends what is allowed but does not silence spec-fallback
	// for other attributes. `bogus` is not a valid meta attribute and must
	// still be reported by the base rule.
	const { violations } = await mlRuleTest(rule, '<meta property="og:title" content="Hello" bogus="x">', {
		nodeRule: [
			{
				selector: ':where(meta[property])',
				rule: {
					options: {
						allowAttrs: [
							{ name: 'property', value: 'NoEmptyAny' },
							{ name: 'content', value: 'NoEmptyAny' },
						],
					},
				},
			},
		],
	});
	expect(violations.some(v => v.raw === 'bogus')).toBe(true);
});
