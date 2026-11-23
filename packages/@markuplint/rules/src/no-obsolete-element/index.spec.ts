import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-obsolete-element-001] normal', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div><p><span></span></p>');
	expect(violations).toStrictEqual([]);
});

test('[no-obsolete-element-002] non-deprecated standard element is not flagged', async () => {
	const { violations } = await mlRuleTest(rule, '<hgroup></hgroup>');
	expect(violations).toStrictEqual([]);
});

test('[no-obsolete-element-003] obsolete', async () => {
	const { violations } = await mlRuleTest(rule, '<font></font><big><blink></blink></big>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "font" element is obsolete',
			line: 1,
			col: 1,
			raw: '<font>',
		},
		{
			severity: 'error',
			message: 'The "big" element is obsolete',
			line: 1,
			col: 14,
			raw: '<big>',
		},
		{
			severity: 'error',
			message: 'The "blink" element is obsolete',
			line: 1,
			col: 19,
			raw: '<blink>',
		},
	]);
});

test('[no-obsolete-element-004] JSX component pretendered to obsolete HTML still reports', async () => {
	const { violations } = await mlRuleTest(rule, '<Marquee>x</Marquee>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [{ selector: 'Marquee', as: 'marquee' }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "marquee" element is obsolete',
			line: 1,
			col: 1,
			raw: '<Marquee>',
		},
	]);
});

test('[no-obsolete-element-005] JSX component pretendered with inheritAttrs object form', async () => {
	const { violations } = await mlRuleTest(rule, '<Marquee>x</Marquee>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [{ selector: 'Marquee', as: { element: 'marquee', inheritAttrs: true } }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "marquee" element is obsolete',
			line: 1,
			col: 1,
			raw: '<Marquee>',
		},
	]);
});

test('[no-obsolete-element-006] HTML→HTML pretender ignored: original deprecation surfaces', async () => {
	// A `pretenders` config is a no-op when the selector matches an HTML element,
	// so `<marquee as="div">` keeps marquee identity and the obsolete check fires.
	const { violations } = await mlRuleTest(rule, '<marquee>x</marquee>', {
		pretenders: [{ selector: 'marquee', as: 'div' }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "marquee" element is obsolete',
			line: 1,
			col: 1,
			raw: '<marquee>',
		},
	]);
});

test('[no-obsolete-element-007] web-component pretendered to obsolete HTML reports', async () => {
	const { violations } = await mlRuleTest(rule, '<x-marquee>x</x-marquee>', {
		pretenders: [{ selector: 'x-marquee', as: 'marquee' }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "marquee" element is obsolete',
			line: 1,
			col: 1,
			raw: '<x-marquee>',
		},
	]);
});

test('[no-obsolete-element-008] Vue web-component pretendered to obsolete HTML reports', async () => {
	// Cross-parser regression: confirm the pretender filter relaxation works when
	// the AST originates from `@markuplint/vue-parser`, not just JSX.
	const { violations } = await mlRuleTest(rule, '<template><x-marquee>x</x-marquee></template>', {
		parser: { '.*': '@markuplint/vue-parser' },
		pretenders: [{ selector: 'x-marquee', as: 'marquee' }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "marquee" element is obsolete',
			line: 1,
			col: 11,
			raw: '<x-marquee>',
		},
	]);
});

// The bundled spec data has no element or attribute with the flag that the tests below need,
// so they pass a spec of their own.
const specs = { '.*': fileURLToPath(new URL('obsolete-fixture.mjs', import.meta.url)) };

test('[no-obsolete-element-009] a MathML and an SVG element that the spec flags obsolete are reported', async () => {
	const { violations } = await mlRuleTest(rule, '<math><mi>x</mi><mn>1</mn></math><svg><circle></circle></svg>', {
		specs,
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "mi" element is obsolete',
			raw: '<mi>',
		},
		{
			severity: 'error',
			line: 1,
			col: 39,
			message: 'The "circle" element is obsolete',
			raw: '<circle>',
		},
	]);
});
