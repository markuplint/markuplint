import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test("[no-deprecated-attr-001] an attribute of the HTML Standard's non-conforming features is obsolete, not deprecated", async () => {
	const { violations } = await mlRuleTest(rule, '<img align="top">');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-attr-002] xml:lang is conforming in the HTML Standard, so it is not deprecated', async () => {
	const { violations } = await mlRuleTest(rule, '<img xml:lang="en-US">');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-attr-003] svg', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<svg viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg">
          <a xlink:href="https://developer.mozilla.org/">
          <text x="10" y="25">MDN Web Docs</text></a>
        </svg>`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 2,
			col: 14,
			message: 'The "xlink:href" attribute is deprecated',
			raw: 'xlink:href',
		},
	]);
});

test('[no-deprecated-attr-004] no deprecated attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to" alt="any picture">');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-attr-005] an upper-case name is the attribute in HTML (here an obsolete one, which is not deprecated)', async () => {
	const { violations } = await mlRuleTest(rule, '<img ALIGN="top">');
	expect(violations).toStrictEqual([]);
});

test('[no-deprecated-attr-006] an HTML element in JSX folds the name (here an obsolete attribute, which is not deprecated)', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<img ALIGN="top" />', options);
	expect(upper.violations).toStrictEqual([]);
	const lower = await mlRuleTest(rule, '<img align="top" />', options);
	expect(lower.violations).toStrictEqual([]);
});

test('[no-deprecated-attr-007] an SVG element in JSX keeps the name as written', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const exact = await mlRuleTest(rule, '<svg><a xlink:href="/" /></svg>', options);
	expect(exact.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			raw: 'xlink:href',
			message: 'The "xlink:href" attribute is deprecated',
		},
	]);
	const upper = await mlRuleTest(rule, '<svg><a XLINK:HREF="/" /></svg>', options);
	expect(upper.violations).toStrictEqual([]);
});

test('[no-deprecated-attr-008] MathML: an attribute that the data flags deprecated is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<math><mfrac numalign="left"><mn>1</mn><mn>2</mn></mfrac></math>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 14,
			raw: 'numalign',
			message: 'The "numalign" attribute is deprecated',
		},
	]);
});

test('[no-deprecated-attr-009] the obsolete but conforming features of the HTML Standard are deprecated', async () => {
	// https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features
	const { violations } = await mlRuleTest(
		rule,
		'<a name="top">Top</a><img src="path/to" alt="" border="0"><style type="text/css"></style>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 4,
			raw: 'name',
			message: 'The "name" attribute is deprecated',
		},
		{
			severity: 'warning',
			line: 1,
			col: 48,
			raw: 'border',
			message: 'The "border" attribute is deprecated',
		},
		{
			severity: 'warning',
			line: 1,
			col: 66,
			raw: 'type',
			message: 'The "type" attribute is deprecated',
		},
	]);
});

test('[no-deprecated-attr-010] script: charset and language are deprecated', async () => {
	const { violations } = await mlRuleTest(rule, '<script src="a.js" charset="utf-8" language="JavaScript"></script>');
	expect(violations.map(v => v.raw)).toStrictEqual(['charset', 'language']);
});

test('[no-deprecated-attr-011] an upper-case name is the attribute in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<a NAME="top">Top</a>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 4,
			raw: 'NAME',
			message: 'The "NAME" attribute is deprecated',
		},
	]);
});

test('[no-deprecated-attr-012] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<a NAME="top" />', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 4,
			raw: 'NAME',
			message: 'The "NAME" attribute is deprecated',
		},
	]);
	const lower = await mlRuleTest(rule, '<a name="top" />', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 4,
			raw: 'name',
			message: 'The "name" attribute is deprecated',
		},
	]);
});

test('[no-deprecated-attr-013] script: type is deprecated when it is the empty string or a JavaScript MIME type essence match', async () => {
	// https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features
	const html = '<script type="text/javascript"></script><script type=""></script><script type="module"></script>';
	const { violations } = await mlRuleTest(rule, html);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			raw: 'type',
			message: 'The "type" attribute is deprecated',
		},
		{
			severity: 'warning',
			line: 1,
			col: 49,
			raw: 'type',
			message: 'The "type" attribute is deprecated',
		},
	]);
});

test('[no-deprecated-attr-014] input: maxlength and size are deprecated on the Number state only', async () => {
	// https://html.spec.whatwg.org/multipage/obsolete.html#obsolete-but-conforming-features
	const number = await mlRuleTest(rule, '<input type="number" maxlength="3" size="4">');
	expect(number.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 22,
			raw: 'maxlength',
			message: 'The "maxlength" attribute is deprecated',
		},
		{
			severity: 'warning',
			line: 1,
			col: 36,
			raw: 'size',
			message: 'The "size" attribute is deprecated',
		},
	]);
	const text = await mlRuleTest(rule, '<input type="text" maxlength="3" size="4">');
	expect(text.violations).toStrictEqual([]);
});

test('[no-deprecated-attr-015] script: type that is not an essence match of a JavaScript MIME type is not deprecated', async () => {
	// https://mimesniff.spec.whatwg.org/#javascript-mime-type-essence-match: the whole string is the essence
	const html =
		'<script></script><script type="text/javascript; charset=utf-8"></script><script type="importmap"></script>';
	expect((await mlRuleTest(rule, html)).violations).toStrictEqual([]);
});

test('[no-deprecated-attr-016] script: the match of the type is ASCII case-insensitive, and a type with no value is the empty string', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="Text/JavaScript"></script><script type></script>');
	expect(violations.map(v => v.raw)).toStrictEqual(['type', 'type']);
});

test('[no-deprecated-attr-017] input: the Number state is matched ASCII case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="NUMBER" maxlength="3" size="4">');
	expect(violations.map(v => v.raw)).toStrictEqual(['maxlength', 'size']);
});

test('[no-deprecated-attr-018] input: maxlength and size are not deprecated when the type is not the Number state', async () => {
	const html = '<input maxlength="3" size="4"><input type="range" size="4">';
	expect((await mlRuleTest(rule, html)).violations.filter(v => v.raw === 'maxlength')).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<input maxlength="3" size="4">')).violations).toStrictEqual([]);
});

test('[no-deprecated-attr-019] deprecatedWhen does not judge an attribute whose value is code that is not a literal', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	expect((await mlRuleTest(rule, '<input type={t} maxlength="3" />', options)).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<script type={t} />', options)).violations).toStrictEqual([]);
});

test('[no-deprecated-attr-020] href of the MathML a element is not deprecated, and that of another MathML element is', async () => {
	// > The href, target, download, ping, rel, hreflang, type and referrerpolicy attributes have the same syntax and semantics as defined for the HTML <a> element.
	// @see https://w3c.github.io/mathml-core/#the-a-element
	expect((await mlRuleTest(rule, '<math><a href="/x"><mi>x</mi></a></math>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<math><mi href="/x">x</mi></math>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 11,
			message: 'The "href" attribute is deprecated',
			raw: 'href',
		},
	]);
});
