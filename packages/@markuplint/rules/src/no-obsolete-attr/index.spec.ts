import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-obsolete-attr-invalid-001] obsolete attribute (link[charset])', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="alternate" href="/feed" charset="utf-8">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			raw: 'charset',
			message: 'The "charset" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-invalid-002] obsolete attribute (link[rev])', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="made" href="/author" rev="made">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'rev',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-issue-4180-001] an attribute name written in upper case is matched case-insensitively', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="made" href="/author" REV="made">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'REV',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-parser-001] a mixed-case JSX prop of an HTML element is the obsolete HTML attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="made" href="/author" Rev="made" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'Rev',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-valid-001] no obsolete attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="alternate" href="/feed">');
	expect(violations).toStrictEqual([]);
});

test("[no-obsolete-attr-valid-002] an attribute of the HTML Standard's non-conforming features is obsolete", async () => {
	const { violations } = await mlRuleTest(rule, '<img align="top">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'align',
			message: 'The "align" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-valid-003] a merely-deprecated attribute is not obsolete', async () => {
	const { violations } = await mlRuleTest(rule, '<a name="top">Top</a>');
	expect(violations).toStrictEqual([]);
});

test('[no-obsolete-attr-issue-4309-001] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<link rel="made" href="/author" REV="made" />', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'REV',
			message: 'The "rev" attribute is obsolete',
		},
	]);
	const lower = await mlRuleTest(rule, '<link rel="made" href="/author" rev="made" />', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'rev',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-invalid-003] the attributes that the HTML Standard lists on all elements are obsolete', async () => {
	// https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features
	const { violations } = await mlRuleTest(rule, '<div contextmenu="m" dropzone="copy" onshow="x"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'contextmenu',
			message: 'The "contextmenu" attribute is obsolete',
		},
		{
			severity: 'error',
			line: 1,
			col: 22,
			raw: 'dropzone',
			message: 'The "dropzone" attribute is obsolete',
		},
		{
			severity: 'error',
			line: 1,
			col: 38,
			raw: 'onshow',
			message: 'The "onshow" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-invalid-004] an obsolete element takes the global attributes, and the obsolete ones among them are reported', async () => {
	const { violations } = await mlRuleTest(rule, '<marquee contextmenu="m" title="t"></marquee>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			raw: 'contextmenu',
			message: 'The "contextmenu" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-invalid-005] SVG 2 removed these attributes', async () => {
	// https://svgwg.org/svg2-draft/changes.html
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" version="1.1"><a xlink:show="new" xlink:actuate="onRequest"></a></svg>';
	const { violations } = await mlRuleTest(rule, svg);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 41,
			raw: 'version',
			message: 'The "version" attribute is obsolete',
		},
		{
			severity: 'error',
			line: 1,
			col: 58,
			raw: 'xlink:show',
			message: 'The "xlink:show" attribute is obsolete',
		},
		{
			severity: 'error',
			line: 1,
			col: 75,
			raw: 'xlink:actuate',
			message: 'The "xlink:actuate" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-invalid-006] SVG Animations: attributeType of animate is not supported by SVG', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<svg xmlns="http://www.w3.org/2000/svg"><animate attributeType="XML" attributeName="x"></animate></svg>',
	);
	expect(violations.map(v => v.raw)).toStrictEqual(['attributeType']);
});
