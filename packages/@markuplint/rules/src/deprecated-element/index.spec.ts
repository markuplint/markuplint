import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[deprecated-element-valid-001] normal', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div><p><span></span></p>');
	expect(violations).toStrictEqual([]);
});

test('[deprecated-element-valid-002] non-deprecated standard element is not flagged', async () => {
	const { violations } = await mlRuleTest(rule, '<hgroup></hgroup>');
	expect(violations).toStrictEqual([]);
});

test('[deprecated-element-invalid-001] deprecated', async () => {
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

test('[deprecated-element-issue-3740-001] JSX component pretendered to obsolete HTML still reports', async () => {
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

test('[deprecated-element-issue-3740-002] JSX component pretendered with inheritAttrs object form', async () => {
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

test('[deprecated-element-issue-3740-003] HTML→HTML pretender ignored: original deprecation surfaces', async () => {
	// `pretenders` config now no-ops when the selector matches an HTML element,
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

test('[deprecated-element-issue-3740-004] web-component pretendered to obsolete HTML reports', async () => {
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

test('[deprecated-element-issue-3740-005] Vue web-component pretendered to obsolete HTML reports', async () => {
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
