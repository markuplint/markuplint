import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

// No HTML or SVG element in the current @markuplint/html-spec data carries
// `deprecated: true` without also carrying `obsolete` (only two MathML
// elements do, and this rule's namespace guard excludes MathML) — so there
// is currently no real fixture that can positively trigger this rule. These
// tests pin the negative cases; add a positive case once the spec data
// gains a deprecated-but-not-obsolete HTML/SVG element.

test('[no-deprecated-element-valid-001] normal', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div><p><span></span></p>');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-element-valid-002] an obsolete element is out of scope for this rule', async () => {
	const { violations } = await mlRuleTest(rule, '<font></font><big><blink></blink></big>');
	expect(violations).toStrictEqual([]);
});
