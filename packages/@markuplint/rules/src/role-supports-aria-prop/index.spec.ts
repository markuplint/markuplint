import type { Pretender, PretenderAttr } from '@markuplint/ml-config';

import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

const jsx = { '.*': '@markuplint/jsx-parser' };

test('[role-supports-aria-prop-001] allowed prop on role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-002] disallowed prop on role', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="heading" aria-pressed="true"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-003] an upper-case aria-* that the role supports is not reported', async () => {
	expect((await mlRuleTest(rule, '<button ARIA-LABEL="x"></button>')).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-004] an upper-case aria-* that the role does not support is reported by the spelling written', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="heading" ARIA-PRESSED="true"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "ARIA-PRESSED" ARIA state is disallowed on the "heading" role',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[role-supports-aria-prop-005] JSX: an upper-case aria-* on an HTML element is checked like the lower-case one', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<button ARIA-LABEL="x" />', { parser })).violations).toStrictEqual([]);

	// Control: the same upper-case name is reported where the role does not support it
	const { violations } = await mlRuleTest(rule, '<div role="heading" ARIA-PRESSED="true" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "ARIA-PRESSED" ARIA state is disallowed on the "heading" role',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[role-supports-aria-prop-006] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg role="heading" ARIA-PRESSED="true" />', { parser })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg role="heading" aria-pressed="true" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

const lines = (...l: readonly string[]) => ['<>', ...l, '</>'].join('\n');

const genericMessage = (name: string) => `The "${name}" ARIA property is disallowed on the "generic" role`;

test('[role-supports-aria-prop-007] JSX: a landmark whose aria-labelledby is not known until it is rendered has a name', async () => {
	const source = lines(
		'<button id={id} type="button">Q1</button>',
		'<div role="region" aria-labelledby={id}>a</div>',
		'<button id={`trigger-${id}`} type="button">Q2</button>',
		'<div role="region" aria-labelledby={`trigger-${id}`}>b</div>',
	);
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-008] JSX: an aria-labelledby that is not output does not name a landmark', async () => {
	// An attribute that the framework does not output is not judged itself, so `aria-roledescription`
	// (prohibited on `generic`, supported on `region`) shows which role the element has
	const { violations } = await mlRuleTest(
		rule,
		'<div role="region" aria-labelledby={undefined} aria-roledescription="x">a</div>',
		{ parser: jsx },
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 48,
			message: genericMessage('aria-roledescription'),
			raw: 'aria-roledescription="x"',
		},
	]);
});

test('[role-supports-aria-prop-009] JSX: an aria-labelledby that refers to nothing does not name a landmark', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="region" aria-labelledby="missing">a</div>', {
		parser: jsx,
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="missing"',
		},
	]);
});

test('[role-supports-aria-prop-010] JSX: a reference may be to an element whose id is not known until it is rendered', async () => {
	const source = lines('<h2 id={x}>Q</h2>', '<div role="region" aria-labelledby="t">a</div>');
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-011] JSX: a reference in a tree whose ids are all known is reported', async () => {
	const source = lines('<h2 id="h">Q</h2>', '<div role="region" aria-labelledby="t">a</div>');
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="t"',
		},
	]);
});

test('[role-supports-aria-prop-012] JSX: an id that is not output is not an element that a reference may be to', async () => {
	const source = lines('<h2 id={undefined}>Q</h2>', '<div role="region" aria-labelledby="t">a</div>');
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="t"',
		},
	]);
});

test('[role-supports-aria-prop-013] JSX: an empty aria-labelledby is not a reference that an id that is not known may satisfy', async () => {
	const source = lines(
		'<h2 id={x}>Q</h2>',
		'<div role="region" aria-labelledby="">a</div>',
		'<div role="region" aria-labelledby=" ">b</div>',
	);
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby=""',
		},
		{
			severity: 'error',
			line: 4,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby=" "',
		},
	]);
});

test('[role-supports-aria-prop-014] JSX: a reference in the content of a template element reaches an id that is not known in the same content', async () => {
	const source = lines(
		'<div><template>',
		'<h2 id={x}>Q</h2>',
		'<div role="region" aria-labelledby="t">a</div>',
		'</template></div>',
	);
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-015] JSX: an id that is not known in the content of a template element is not in the tree of the reference', async () => {
	const source = lines(
		'<div><template><h2 id={x}>Q</h2></template></div>',
		'<div role="region" aria-labelledby="t">a</div>',
	);
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="t"',
		},
	]);
});

test('[role-supports-aria-prop-016] JSX: the landmark itself may be the element that its aria-labelledby refers to', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="region" id={x} aria-labelledby="t">a</div>', { parser: jsx })).violations,
	).toStrictEqual([]);
});

test('[role-supports-aria-prop-017] JSX: an element whose implicit role is a landmark has the role by the presence of aria-labelledby, not by what it refers to', async () => {
	// `aria-roledescription` (prohibited on `generic`, supported on `region`) shows which role the element has
	const source = lines('<h2 id="h">Q</h2>', '<section aria-labelledby="t" aria-roledescription="x">a</section>');
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-018] JSX pretenders: a landmark component that takes over the aria-labelledby of its usage', async () => {
	const pretenders = [
		{
			selector: 'Region',
			as: { element: 'div', attrs: [{ name: 'role', value: 'region' }], inheritAttrs: true },
		},
	];
	expect(
		(await mlRuleTest(rule, '<Region aria-labelledby={id}>a</Region>', { parser: jsx, pretenders })).violations,
	).toStrictEqual([]);
});

const regionMadeBy = (value: PretenderAttr['value']): readonly Pretender[] => [
	{
		selector: 'Region',
		as: {
			element: 'div',
			attrs: [
				{ name: 'role', value: 'region' },
				{ name: 'aria-labelledby', value },
			],
		},
	},
];

test('[role-supports-aria-prop-019] JSX pretenders: a landmark component whose aria-labelledby is the prop that is forwarded', async () => {
	const pretenders = regionMadeBy({ fromAttr: 'labelledBy' });
	expect(
		(await mlRuleTest(rule, '<Region labelledBy={id}>a</Region>', { parser: jsx, pretenders })).violations,
	).toStrictEqual([]);
});

test('[role-supports-aria-prop-020] JSX pretenders: a landmark component whose aria-labelledby is not known', async () => {
	const pretenders = regionMadeBy({ dynamic: true });
	expect((await mlRuleTest(rule, '<Region>a</Region>', { parser: jsx, pretenders })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-021] JSX pretenders: a landmark component whose aria-labelledby refers to nothing', async () => {
	const pretenders = regionMadeBy({ fromAttr: 'labelledBy' });
	const { violations } = await mlRuleTest(rule, '<Region labelledBy="missing">a</Region>', {
		parser: jsx,
		pretenders,
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: genericMessage('aria-labelledby'),
			raw: '<Region labelledBy="missing">',
		},
	]);
});

const headingMadeBy = (attr: PretenderAttr): readonly Pretender[] => [
	{ selector: 'Heading', as: { element: 'h2', attrs: [attr] } },
];
const headingSource = lines('<Heading id={x}>Q</Heading>', '<div role="region" aria-labelledby="t">a</div>');

test('[role-supports-aria-prop-022] JSX pretenders: a component whose id is the prop that is forwarded may be what a reference is to', async () => {
	const pretenders = headingMadeBy({ name: 'id', value: { fromAttr: 'id' } });
	expect((await mlRuleTest(rule, headingSource, { parser: jsx, pretenders })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-023] JSX pretenders: a component whose id is not known may be what a reference is to', async () => {
	const pretenders = headingMadeBy({ name: 'id', value: { dynamic: true } });
	expect((await mlRuleTest(rule, headingSource, { parser: jsx, pretenders })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-024] JSX pretenders: an id that a component forwards from its usage names the landmark', async () => {
	const pretenders = headingMadeBy({ name: 'id', value: { fromAttr: 'headingId' } });
	const source = lines('<Heading headingId="t">Q</Heading>', '<div role="region" aria-labelledby="t">a</div>');
	expect((await mlRuleTest(rule, source, { parser: jsx, pretenders })).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-025] JSX pretenders: a reference to another id than the one a component forwards is reported', async () => {
	const pretenders = headingMadeBy({ name: 'id', value: { fromAttr: 'headingId' } });
	const source = lines('<Heading headingId="t">Q</Heading>', '<div role="region" aria-labelledby="other">a</div>');
	expect((await mlRuleTest(rule, source, { parser: jsx, pretenders })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="other"',
		},
	]);
});

const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

test('[role-supports-aria-prop-026] Vue: a reference may be to an element whose id is not known until it is rendered', async () => {
	const source = [
		'<template>',
		'<div>',
		'<h2 :id="x">Q</h2>',
		'<div role="region" aria-labelledby="t">a</div>',
		'<div role="region" :aria-labelledby="y">b</div>',
		'</div>',
		'</template>',
	].join('\n');
	expect((await mlRuleTest(rule, source, vue)).violations).toStrictEqual([]);

	// Control: all the ids are known
	const known = [
		'<template>',
		'<div>',
		'<h2 id="h">Q</h2>',
		'<div role="region" aria-labelledby="t">a</div>',
		'</div>',
		'</template>',
	].join('\n');
	expect((await mlRuleTest(rule, known, vue)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 4,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="t"',
		},
	]);
});

test('[role-supports-aria-prop-027] Svelte: a reference may be to an element whose id is not known until it is rendered', async () => {
	const source = [
		'<h2 id={x}>Q</h2>',
		'<div role="region" aria-labelledby="t">a</div>',
		'<div role="region" aria-labelledby={y}>b</div>',
	].join('\n');
	expect((await mlRuleTest(rule, source, svelte)).violations).toStrictEqual([]);

	// Control: all the ids are known
	const known = ['<h2 id="h">Q</h2>', '<div role="region" aria-labelledby="t">a</div>'].join('\n');
	expect((await mlRuleTest(rule, known, svelte)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 20,
			message: genericMessage('aria-labelledby'),
			raw: 'aria-labelledby="t"',
		},
	]);
});

test('[role-supports-aria-prop-028] JSX: an element whose role is not known until it is rendered is not judged by the implicit role', async () => {
	const source = [
		'<>',
		'<div role={props.role} aria-pressed="true" />',
		'<div role={props.role} aria-labelledby="t" />',
		'<input role={props.role} aria-checked="true" />',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser: jsx })).violations).toStrictEqual([]);

	// Control: a role that the markup tells is judged
	const { violations } = await mlRuleTest(rule, '<div role="heading" aria-pressed="true" />', { parser: jsx });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-029] JSX: an attribute that the framework does not output is not a role that is not known', async () => {
	const { violations } = await mlRuleTest(rule, '<div role={undefined} aria-pressed="true" />', { parser: jsx });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: 'The "aria-pressed" ARIA state is disallowed on the "generic" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-030] JSX: a spread attribute may carry the role, so an element without the role attribute is not judged', async () => {
	expect(
		(await mlRuleTest(rule, '<div {...props} aria-pressed="true" />', { parser: jsx })).violations,
	).toStrictEqual([]);

	// Control: the role that the markup tells is judged although a spread attribute is there
	const { violations } = await mlRuleTest(rule, '<div {...props} role="heading" aria-pressed="true" />', {
		parser: jsx,
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-031] Vue: a role that a binding gives is not known until it is rendered', async () => {
	const source = [
		'<template>',
		'<div :role="r" aria-pressed="true">a</div>',
		'<div v-bind:role="r" aria-pressed="true">b</div>',
		'<div v-bind="props" aria-pressed="true">c</div>',
		'<div role="heading" v-bind="props" aria-pressed="true">d</div>',
		'</template>',
	].join('\n');
	expect((await mlRuleTest(rule, source, vue)).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged, also after an object that is bound before it
	const control = '<template><div role="heading" aria-pressed="true">a</div></template>';
	expect((await mlRuleTest(rule, control, vue)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
	const after = '<template><div v-bind="props" role="heading" aria-pressed="true">a</div></template>';
	expect((await mlRuleTest(rule, after, vue)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 46,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-032] Svelte: a role that code gives, and a spread attribute, are not known until they are rendered', async () => {
	const source = ['<div role={r} aria-pressed="true">a</div>', '<div {...props} aria-pressed="true">b</div>'].join(
		'\n',
	);
	expect((await mlRuleTest(rule, source, svelte)).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged
	expect(
		(await mlRuleTest(rule, '<div role="heading" aria-pressed="true">a</div>', svelte)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-033] Astro: a role that code gives, and a spread attribute, are not known until they are rendered', async () => {
	const astro = { parser: { '.*': '@markuplint/astro-parser' } };
	const source = ['<div role={r} aria-pressed="true">a</div>', '<div {...props} aria-pressed="true">b</div>'].join(
		'\n',
	);
	expect((await mlRuleTest(rule, source, astro)).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged
	expect((await mlRuleTest(rule, '<div role="heading" aria-pressed="true">a</div>', astro)).violations).toStrictEqual(
		[
			{
				severity: 'error',
				line: 1,
				col: 21,
				message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
				raw: 'aria-pressed="true"',
			},
		],
	);
});

test('[role-supports-aria-prop-034] JSX: a spread attribute after the role attribute may override it', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="heading" {...props} aria-pressed="true" />', { parser: jsx })).violations,
	).toStrictEqual([]);

	// Control: the spread is before the role attribute, so the role is the one written
	expect(
		(await mlRuleTest(rule, '<div {...props} role="heading" aria-pressed="true" />', { parser: jsx })).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

/**
 * A landmark whose `aria-labelledby` refers to an id that nothing in the file has falls back to `generic`.
 * An element with spread attributes, a component that no pretender resolved and content that is not known
 * may be the element that has the id.
 */
describe('an id that the markup does not tell', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

	test('[role-supports-aria-prop-035] a landmark that refers to an id that an unknown element may have has the role', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<>
	<h2 {...props}>spread</h2>
	<div role="region" aria-labelledby="spread-id">a</div>
	<Header />
	<div role="region" aria-labelledby="in-component">b</div>
	<Dyn />
	<div role="region" aria-labelledby="in-dyn">c</div>
</>`,
			{
				...jsx,
				pretenders: [{ selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true }] } }],
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test.each([
		['a spread', '<><h2 {...props}>t</h2><div role="region" aria-labelledby="t">a</div></>'],
		['a spread after the id', '<><h2 id="x" {...props}>t</h2><div role="region" aria-labelledby="t">a</div></>'],
		[
			'an id that code gives after a static one',
			'<><h2 id="x" id={y}>t</h2><div role="region" aria-labelledby="t">a</div></>',
		],
		['a component', '<><Header /><div role="region" aria-labelledby="t">a</div></>'],
		['a pretender with unknown contents', '<><Dyn /><div role="region" aria-labelledby="t">a</div></>'],
		['a block of children', '<><div>{children}</div><div role="region" aria-labelledby="t">a</div></>'],
	])('[role-supports-aria-prop-036] %s may have the id', async (_, source) => {
		const dyn = { selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true as const }] } };
		expect((await mlRuleTest(rule, source, { ...jsx, pretenders: [dyn] })).violations).toStrictEqual([]);
	});

	test('[role-supports-aria-prop-037] a tree whose ids the markup tells does not have it: the landmark falls back to generic', async () => {
		// A spread before the id is overridden by it
		const { violations } = await mlRuleTest(
			rule,
			'<><h2 {...props} id="h">t</h2><div role="region" aria-labelledby="t">a</div></>',
			jsx,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 50,
				message: 'The "aria-labelledby" ARIA property is disallowed on the "generic" role',
				raw: 'aria-labelledby="t"',
			},
		]);
	});

	test('[role-supports-aria-prop-038] a landmark that refers to an element that a pretender declares has the role', async () => {
		const source = '<><Heading>Q</Heading><div role="region" aria-labelledby="t">a</div></>';
		const heading = (id: string | { readonly dynamic: true }): Pretender => ({
			selector: 'Heading',
			as: {
				element: 'div',
				contents: [{ element: 'h2', attrs: [{ name: 'id', value: id }] }, { slot: true }],
			},
		});
		expect((await mlRuleTest(rule, source, { ...jsx, pretenders: [heading('t')] })).violations).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, source, { ...jsx, pretenders: [heading({ dynamic: true })] })).violations,
		).toStrictEqual([]);
		expect((await mlRuleTest(rule, source, { ...jsx, pretenders: [heading('u')] })).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 42,
				message: 'The "aria-labelledby" ARIA property is disallowed on the "generic" role',
				raw: 'aria-labelledby="t"',
			},
		]);
	});
});
