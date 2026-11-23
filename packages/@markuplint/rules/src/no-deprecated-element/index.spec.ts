import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

// No HTML or SVG element in the current @markuplint/html-spec data carries
// `deprecated: true` without also carrying `obsolete`; the two MathML elements
// `maction` and `mfenced` do, so they are the real fixtures that trigger this
// rule. The tests on HTML pin the negative cases; add a positive case once the
// spec data gains a deprecated-but-not-obsolete HTML/SVG element.

test('[no-deprecated-element-001] normal', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div><p><span></span></p>');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-element-002] an obsolete element is out of scope for this rule', async () => {
	const { violations } = await mlRuleTest(rule, '<font></font><big><blink></blink></big>');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-element-003] MathML: an element that the data flags deprecated is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<math><maction></maction><mfenced></mfenced></math>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 7,
			message: 'The "maction" element is deprecated',
			raw: '<maction>',
		},
		{
			severity: 'warning',
			line: 1,
			col: 26,
			message: 'The "mfenced" element is deprecated',
			raw: '<mfenced>',
		},
	]);
});

test('[no-deprecated-element-004] MathML: a current element is not reported', async () => {
	const { violations } = await mlRuleTest(rule, '<math><mi>x</mi><mfrac><mn>1</mn><mn>2</mn></mfrac></math>');
	expect(violations).toStrictEqual([]);
});

// The bundled spec data has no element or attribute with the flag that the tests below need,
// so they pass a spec of their own.
const specs = { '.*': fileURLToPath(new URL('deprecated-fixture.mjs', import.meta.url)) };

test('[no-deprecated-element-005] an SVG element that the spec flags deprecated is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<svg><circle></circle></svg>', { specs });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: '<circle>',
			message: 'The "circle" element is deprecated',
		},
	]);
});
