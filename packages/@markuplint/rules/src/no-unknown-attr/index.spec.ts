import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unknown-attr-001] global attribute', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<a title="the a element"><abbr title="the abbr element">text</abbr></a>',
	);

	expect(violations).toStrictEqual([]);
});

test('[no-unknown-attr-002] Add allow attr', async () => {
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

test('[no-unknown-attr-003] custom element', async () => {
	const { violations } = await mlRuleTest(rule, '<custom-element any-attr></custom-element>');

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-004] prefix attribute', async () => {
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

test('[no-unknown-attr-005] ignore prefix attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<div v-bind:title="title" :class="classes" @click="click"></div>', {
		rule: {
			options: {
				ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
			},
		},
	});

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-006] Foreign element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
	);

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-007] svg', async () => {
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

test('[no-unknown-attr-008] Pug', async () => {
	const { violations } = await mlRuleTest(rule, 'button(type=buttonType)', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-009] Pug class', async () => {
	const { violations } = await mlRuleTest(rule, 'div.className', {
		parser: {
			'.*': '@markuplint/pug-parser',
		},
	});

	expect(violations.length).toBe(0);
});

test('[no-unknown-attr-010] Vue slot', async () => {
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

test('[no-unknown-attr-011] Vue (.prop shorthand)', async () => {
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

test('[no-unknown-attr-012] MDX with react-spec (className is valid via IDL resolution)', async () => {
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

test('[no-unknown-attr-013] React Component', async () => {
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

test('[no-unknown-attr-014] React HTML', async () => {
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

test('[no-unknown-attr-015] React', async () => {
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

test('[no-unknown-attr-016] React: a custom rule and a mutable attribute', async () => {
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

test('[no-unknown-attr-017] Pretenders', async () => {
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

test('[no-unknown-attr-018] Svelte: class="foo" is valid (content attribute name accepted)', async () => {
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

test('[no-unknown-attr-019] Svelte: className="foo" is valid (IDL attribute name accepted in both mode)', async () => {
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

test('[no-unknown-attr-020] Svelte: tabIndex is valid (IDL name accepted in both mode)', async () => {
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

test('[no-unknown-attr-021] WAI-Adapt', async () => {
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

test('[no-unknown-attr-022] The `as` attribute', async () => {
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

test('[no-unknown-attr-023] imagesrcset and imagesizes of a link are known, and so are imageSrcSet and imageSizes in JSX', async () => {
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

test('[no-unknown-attr-024] a class name with a colon is valid on an HTML and an SVG element', async () => {
	expect((await mlRuleTest(rule, '<div class="md:flex"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<svg><rect class="md:flex"/></svg>')).violations).toStrictEqual([]);
});

test('[no-unknown-attr-025] the # shorthand of v-slot is not an unknown attribute in Vue', async () => {
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

test('[no-unknown-attr-026] an event handler with a modifier through the @ shorthand is not an unknown attribute in Vue', async () => {
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

test('[no-unknown-attr-027] the microdata attributes of the elements of a Pug template are known', async () => {
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

test('[no-unknown-attr-028] suggests similar attribute name for typo', async () => {
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

test('[no-unknown-attr-029] suggests similar attribute name for class typo', async () => {
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

test('[no-unknown-attr-030] no suggestion for completely unrelated attribute', async () => {
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

test('[no-unknown-attr-031] a completely unknown attribute name is disallowed', async () => {
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

test('[no-unknown-attr-032] React with spread attribute: unknown-name half', async () => {
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

test('[no-unknown-attr-033] React spec: unknown-name half of the controlled-component check', async () => {
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

test('[no-unknown-attr-034] base rule still flags unknown attributes on meta[property]', async () => {
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

test('[no-unknown-attr-035] HTML: an upper-case data-*, aria-* and role are exempt as their lower-case spellings are', async () => {
	expect(
		(await mlRuleTest(rule, '<div DATA-VALUE="1" ARIA-LABEL="label" ROLE="button"></div>')).violations,
	).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div DATA-VALUE ARIA-LABEL ROLE BOGUS></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "BOGUS" attribute is disallowed',
			raw: 'BOGUS',
		},
	]);
});

test('[no-unknown-attr-036] HTML: VIEWBOX and viewbox are viewBox on an SVG element', async () => {
	expect((await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1" viewbox="0 0 1 1"></svg>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1" BOGUS></svg>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "BOGUS" attribute is disallowed',
			raw: 'BOGUS',
		},
	]);
});

test('[no-unknown-attr-037] JSX: an HTML element folds an upper-case data-*', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<div DATA-VALUE="1" />', { parser })).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div DATA-VALUE="1" BOGUS />', { parser })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "BOGUS" attribute is disallowed',
			raw: 'BOGUS',
		},
	]);
});

test('[no-unknown-attr-038] JSX: an SVG element keeps the name as written, so ROLE is not role', async () => {
	expect(
		(await mlRuleTest(rule, '<svg ROLE="img" />', { parser: { '.*': '@markuplint/jsx-parser' } })).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "ROLE" attribute is disallowed. Did you mean "role"?',
			raw: 'ROLE',
		},
	]);
});

test('[no-unknown-attr-039] JSX: an SVG element keeps the name as written, so VIEWBOX is not viewBox', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg viewBox="0 0 1 1" />', { parser })).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1" />', { parser })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "VIEWBOX" attribute is disallowed. Did you mean "viewBox"?',
			raw: 'VIEWBOX',
		},
	]);
});

test('[no-unknown-attr-040] HTML: allowAttrs matches the name in any spelling the DOM makes the same', async () => {
	expect(
		(await mlRuleTest(rule, '<div X-ATTR></div>', { rule: { options: { allowAttrs: ['x-attr'] } } })).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<div x-attr></div>', { rule: { options: { allowAttrs: ['X-ATTR'] } } })).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<div X-ATTR></div>', {
				rule: { options: { allowAttrs: [{ name: 'x-attr', value: 'Int' }] } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<div X-ATTR></div>', { rule: { options: { allowAttrs: { 'x-attr': 'Int' } } } }))
			.violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<div X-OTHER></div>', { rule: { options: { allowAttrs: ['x-attr'] } } })).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "X-OTHER" attribute is disallowed',
			raw: 'X-OTHER',
		},
	]);
});

test('[no-unknown-attr-041] HTML: ignoreAttrNamePrefix matches the name in any spelling the DOM makes the same', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div V-BIND:TITLE="a"></div>', {
				rule: { options: { ignoreAttrNamePrefix: ['v-bind:'] } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<div v-bind:title="a"></div>', {
				rule: { options: { ignoreAttrNamePrefix: 'V-BIND:' } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<div V-ON:CLICK="a"></div>', {
				rule: { options: { ignoreAttrNamePrefix: ['v-bind:'] } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "V-ON:CLICK" attribute is disallowed. Did you mean "onclick"?',
			raw: 'V-ON:CLICK',
		},
	]);
});

test('[no-unknown-attr-042] JSX: the options keep the name as written on an SVG element', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(
			await mlRuleTest(rule, '<svg X-ATTR V-BIND:TITLE />', {
				parser,
				rule: { options: { allowAttrs: ['X-ATTR'], ignoreAttrNamePrefix: ['V-BIND:'] } },
			})
		).violations,
	).toStrictEqual([]);
	expect(
		(
			await mlRuleTest(rule, '<svg X-ATTR V-BIND:TITLE />', {
				parser,
				rule: { options: { allowAttrs: ['x-attr'], ignoreAttrNamePrefix: ['v-bind:'] } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "X-ATTR" attribute is disallowed',
			raw: 'X-ATTR',
		},
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "V-BIND:TITLE" attribute is disallowed',
			raw: 'V-BIND:TITLE',
		},
	]);
});

test('[no-unknown-attr-043] Vue: an HTML element folds an upper-case data-*', async () => {
	const options = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	expect((await mlRuleTest(rule, '<template><div DATA-X="1"></div></template>', options)).violations).toStrictEqual(
		[],
	);
	// The control: the rule reports an unknown name in the same document
	expect((await mlRuleTest(rule, '<template><div BOGUS="1"></div></template>', options)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "BOGUS" attribute is disallowed',
			raw: 'BOGUS',
		},
	]);
});

test('[no-unknown-attr-044] Vue: an SVG element keeps the name as written, so ROLE is not role', async () => {
	const options = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	expect((await mlRuleTest(rule, '<template><svg ROLE="img"></svg></template>', options)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "ROLE" attribute is disallowed. Did you mean "role"?',
			raw: 'ROLE',
		},
	]);
});

test('[no-unknown-attr-045] Svelte: a static name is read by the HTML parser, a dynamic one is set by code', async () => {
	const options = { parser: { '.*': '@markuplint/svelte-parser' }, specs: { '.*': '@markuplint/svelte-spec' } };
	// Static: `VIEWBOX` is `viewBox`
	expect((await mlRuleTest(rule, '<svg VIEWBOX="0 0 1 1"></svg>', options)).violations).toStrictEqual([]);
	// Dynamic: the name stays as written, which is not `viewBox`
	expect((await mlRuleTest(rule, '<svg VIEWBOX={x}></svg>', options)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "VIEWBOX" attribute is disallowed. Did you mean "viewBox"?',
			raw: 'VIEWBOX',
		},
	]);
});

test('[no-unknown-attr-046] the suggested name of a property is an attribute name and is not translated', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<svg ROLE="img"></svg>',
		{
			parser: { '.*': '@markuplint/jsx-parser' },
			specs: { '.*': '@markuplint/react-spec' },
		},
		false,
		'ja',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: '属性「ROLE」は許可されていません。「role」ではありませんか？',
			raw: 'ROLE',
		},
	]);
});

// React moves a `<style>` that has `href` and `precedence`, and a `<link rel="stylesheet">` that has
// `precedence`, to the `<head>` (https://react.dev/reference/react-dom/components/style), so these are
// the attributes of a React that does.
test('[no-unknown-attr-047] React: href and precedence of a style element, and precedence of a link element', async () => {
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	expect((await mlRuleTest(rule, '<style href="a" precedence="b"></style>', react)).violations).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<link rel="stylesheet" href="a" precedence="b" />', react)).violations,
	).toStrictEqual([]);
});

test('[no-unknown-attr-048] the spec for a React that does not move elements does not have them', async () => {
	const react18 = {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec/react-18' },
	};
	expect(
		(await mlRuleTest(rule, '<link rel="stylesheet" href="a" precedence="b" />', react18)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The "precedence" attribute is disallowed',
			raw: 'precedence',
		},
	]);
});

// The IDL attribute `acceptCharset` reflects the `accept-charset` content attribute
// (https://html.spec.whatwg.org/multipage/forms.html#htmlformelement), as `httpEquiv` reflects `http-equiv`.
test('[no-unknown-attr-049] React: acceptCharset is the accept-charset attribute of a form element', async () => {
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	expect(
		(await mlRuleTest(rule, '<form action="/submit" acceptCharset="utf-8"></form>', react)).violations,
	).toStrictEqual([]);
});

test('[no-unknown-attr-050] React: accept-charset suggests the property', async () => {
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	expect(
		(await mlRuleTest(rule, '<form action="/submit" accept-charset="utf-8"></form>', react)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "accept-charset" attribute is disallowed. Did you mean "acceptCharset"?',
			raw: 'accept-charset',
		},
	]);
});

test('[no-unknown-attr-051] React: httpEquiv is the http-equiv attribute of a meta element, and the content spelling suggests it', async () => {
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };
	expect(
		(await mlRuleTest(rule, '<meta httpEquiv="X-UA-Compatible" content="ie=edge" />', react)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<meta http-equiv="X-UA-Compatible" content="ie=edge" />', react)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "http-equiv" attribute is disallowed. Did you mean "httpEquiv"?',
			raw: 'http-equiv',
		},
	]);
});

test('[no-unknown-attr-052] HTML: accept-charset of a form element is allowed, and acceptcharset is not', async () => {
	expect((await mlRuleTest(rule, '<form action="/submit" accept-charset="utf-8"></form>')).violations).toStrictEqual(
		[],
	);
	expect((await mlRuleTest(rule, '<form action="/submit" acceptcharset="utf-8"></form>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "acceptcharset" attribute is disallowed. Did you mean "accept-charset"?',
			raw: 'acceptcharset',
		},
	]);
});

test('[no-unknown-attr-053] Svelte: acceptCharset and accept-charset are both the attribute of a form element', async () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' }, specs: { '.*': '@markuplint/svelte-spec' } };
	expect(
		(await mlRuleTest(rule, '<form action="/submit" acceptCharset="utf-8"></form>', svelte)).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<form action="/submit" accept-charset="utf-8"></form>', svelte)).violations,
	).toStrictEqual([]);
});

test('[no-unknown-attr-054] HTML: the attributes that specifications other than the HTML Standard define are known', async () => {
	// Remote Playback, Picture-in-Picture, WICG controls-list, HTML Media Capture and the Entries API
	for (const html of [
		'<audio controlslist="nodownload" disableremoteplayback></audio>',
		'<video controlslist="nodownload" disablepictureinpicture disableremoteplayback></video>',
		'<input type="file" accept="image/*" capture="user" webkitdirectory>',
		'<img src="a.png" alt="photo" controls>',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
});

test('[no-unknown-attr-055] SVG: pattern x and y, mask-type of mask and in of feDisplacementMap are known', async () => {
	// https://svgwg.org/svg2-draft/pservers.html#PatternElementXAttribute
	// https://drafts.csswg.org/css-masking-1/#propdef-mask-type
	// https://drafts.csswg.org/filter-effects-1/#feDisplacementMapElement
	const svg = `<svg xmlns="http://www.w3.org/2000/svg">
<pattern x="1" y="2" width="3" height="4"></pattern>
<mask mask-type="alpha"></mask>
<filter><feDisplacementMap in="SourceGraphic" in2="SourceAlpha"></feDisplacementMap></filter>
</svg>`;
	expect((await mlRuleTest(rule, svg)).violations).toStrictEqual([]);
});

test('[no-unknown-attr-056] SVG: an attribute that no specification defines for the element is known by its status flag', async () => {
	// SVG Animations: the attributeType attribute is not supported by SVG (obsolete), and SVG 2 gives defs and
	// pattern no conditional processing attributes (non-standard, as BCD has them).
	const svg = `<svg xmlns="http://www.w3.org/2000/svg">
<animate attributeType="XML"></animate>
<defs systemLanguage="ja"></defs>
<pattern systemLanguage="ja"></pattern>
</svg>`;
	const { violations } = await mlRuleTest(rule, svg);
	expect(violations).toStrictEqual([]);
});

test('[no-unknown-attr-057] SVG: decoding of the image element is known, though no specification defines it for the element', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<svg xmlns="http://www.w3.org/2000/svg"><image href="a.png" decoding="async"></image></svg>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-unknown-attr-058] audio: disablepictureinpicture is defined for the video element only', async () => {
	// https://w3c.github.io/picture-in-picture/#disable-pip
	const { violations } = await mlRuleTest(rule, '<audio disablepictureinpicture></audio>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "disablepictureinpicture" attribute is disallowed',
			raw: 'disablepictureinpicture',
		},
	]);
});

test('[no-unknown-attr-059] iframe: fetchpriority is defined for img, link and script only', async () => {
	// https://html.spec.whatwg.org/multipage/indices.html#attributes-3
	const { violations } = await mlRuleTest(rule, '<iframe fetchpriority="high"></iframe>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The "fetchpriority" attribute is disallowed',
			raw: 'fetchpriority',
		},
	]);
});

test('[no-unknown-attr-060] an obsolete element takes the global attributes of HTML', async () => {
	// https://html.spec.whatwg.org/multipage/dom.html#global-attributes
	const { violations } = await mlRuleTest(rule, '<acronym class="a" title="t"></acronym>');
	expect(violations).toStrictEqual([]);
});

test('[no-unknown-attr-061] part and exportparts are known on HTML, SVG and MathML elements', async () => {
	// https://drafts.csswg.org/css-shadow-1/#part-attr
	const html = `<div part="a b" exportparts="a, b : c"></div>
<svg xmlns="http://www.w3.org/2000/svg"><rect part="a" exportparts="b"></rect><circle part="a"></circle></svg>
<math><mi part="a" exportparts="b"></mi></math>`;
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
});

test('[no-unknown-attr-062] customelementregistry is known on every HTML element', async () => {
	// https://html.spec.whatwg.org/multipage/custom-elements.html#the-customelementregistry-attribute
	const html =
		'<div customelementregistry><span customelementregistry></span><my-element customelementregistry></my-element></div>';
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
});

test('[no-unknown-attr-063] customelementregistry is not an attribute of an SVG or a MathML element', async () => {
	// > All HTML elements may have the customelementregistry content attribute set.
	// @see https://html.spec.whatwg.org/multipage/custom-elements.html#the-customelementregistry-attribute
	expect((await mlRuleTest(rule, '<svg customelementregistry></svg>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "customelementregistry" attribute is disallowed',
			raw: 'customelementregistry',
		},
	]);
	expect((await mlRuleTest(rule, '<math customelementregistry></math>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "customelementregistry" attribute is disallowed',
			raw: 'customelementregistry',
		},
	]);
});

test.each([
	['<svg hidden></svg>', 6, 'hidden'],
	['<svg accesskey="a"></svg>', 6, 'accesskey'],
	['<svg popover></svg>', 6, 'popover'],
	['<svg><circle hidden></circle></svg>', 14, 'hidden'],
	['<svg><g popover></g></svg>', 9, 'popover'],
	['<svg><a href="#" accesskey="a"></a></svg>', 18, 'accesskey'],
])(
	'[no-unknown-attr-064] an SVG element does not take the global attributes of HTML elements: %s',
	async (html, col, raw) => {
		// > The following attributes are common to and may be specified on all HTML elements (even those not defined in this specification):
		// @see https://html.spec.whatwg.org/multipage/dom.html#global-attributes
		expect((await mlRuleTest(rule, html)).violations).toStrictEqual([
			{ severity: 'error', line: 1, col, message: `The "${raw}" attribute is disallowed`, raw },
		]);
	},
);

test('[no-unknown-attr-067] the attributes of the HTML a element are known on the MathML a element', async () => {
	// > The a element accepts the attributes described in 2.1.3 Global Attributes as well as corresponding attributes of the HTML <a> element: href, target, download, ping, rel, hreflang, type, referrerpolicy
	// @see https://w3c.github.io/mathml-core/#the-a-element
	const html =
		'<math><a href="/x" target="_blank" download ping="https://example.com/p" rel="noopener" hreflang="en" type="text/html" referrerpolicy="origin"><mi>x</mi></a></math>';
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<math><a foo="x"><mi>x</mi></a></math>')).violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 10, message: 'The "foo" attribute is disallowed', raw: 'foo' },
	]);
});

test.each([
	'<svg><defs slot="icon" nonce="abc" elementtiming="c"></defs><desc slot="x"></desc></svg>',
	'<svg><linearGradient slot="icon"></linearGradient><script nonce="abc"></script></svg>',
	'<math slot="a" nonce="b" elementtiming="c"><mi slot="x">x</mi></math>',
])(
	'[no-unknown-attr-066] the attributes that any element takes are known on every SVG and MathML element: %s',
	async html => {
		// > DOM defines the user agent requirements for the class, id, and slot attributes for any element in any namespace.
		// @see https://html.spec.whatwg.org/multipage/dom.html#global-attributes
		expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
	},
);

test.each([
	'<svg slot="icon" nonce="abc" xml:lang="en" lang="en" part="a" exportparts="b" elementtiming="c"></svg>',
	'<svg><g slot="icon" nonce="abc" xml:lang="en"></g><text elementtiming="c">a</text></svg>',
	'<svg><image href="a.png" slot="icon" elementtiming="c"></image></svg>',
])('[no-unknown-attr-065] the attributes that any element takes are known on an SVG element: %s', async html => {
	// > DOM defines the user agent requirements for the class, id, and slot attributes for any element in any namespace.
	// @see https://html.spec.whatwg.org/multipage/dom.html#global-attributes
	//
	// > Elements that have a nonce content attribute ensure that the cryptographic nonce is only exposed to script […] exposing it to script via the HTMLOrSVGOrMathMLElement interface mixin
	// @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#nonce-attributes
	//
	// > Elements that have a "elementtiming" content attribute are reported in the report image element timing and the report text element timing algorithms.
	// @see https://w3c.github.io/element-timing/#sec-elements-exposed
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
});
