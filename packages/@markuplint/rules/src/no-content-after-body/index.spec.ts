import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-content-after-body-001] a start tag after the body end tag', async () => {
	expect(
		(await mlRuleTest(rule, '<!doctype html>\n<body>\n</body>\n<p>stray paragraph</p>\n')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 4,
			col: 1,
			raw: '<p>',
			message: 'Content after the end tag of the "body" element is not allowed',
		},
	]);
});

test('[no-content-after-body-002] non-whitespace text after the body end tag', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body></body>text\n')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 14,
			raw: 'text\n',
			message: 'Content after the end tag of the "body" element is not allowed',
		},
	]);
});

test('[no-content-after-body-003] trailing whitespace after the body end tag is allowed', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body></body>\n\n')).violations).toStrictEqual([]);
});

test('[no-content-after-body-004] no explicit body end tag', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body><p>only paragraph</p>')).violations).toStrictEqual([]);
});

test('[no-content-after-body-005] content nested inside the body element', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body><p>inside body</p></body>')).violations).toStrictEqual([]);
});

test('[no-content-after-body-006] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body></body></html><p>x</p>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: '「body」要素の終了タグの後にコンテンツを置くことはできません',
			raw: '<p>',
		},
	]);
});

test('[no-content-after-body-007] the body whose start tag is omitted is closed by its end tag', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><title>t</title><p>x</p></body><p>y</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 47,
			message: 'Content after the end tag of the "body" element is not allowed',
			raw: '<p>',
		},
	]);
});

test('[no-content-after-body-008] the first of two end tags of `body` closes it, so the text between them is after it', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<!doctype html><html><head></head><body><p>x</p></body>y</body></html>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'Content after the end tag of the "body" element is not allowed',
			raw: 'y',
		},
	]);
});

test('[no-content-after-body-009] the end tag of `html` closes `body` when it comes first, and a later end tag of `body` does not', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<!doctype html><html><head></head><body><p>x</p></html></body><p>z</p>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 63,
			message: 'Content after the end tag of the "html" element is not allowed',
			raw: '<p>',
		},
	]);
});

test('[no-content-after-body-010] content after the end tag of `html` that closed `body` is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><html><head></head><body><p>x</p></html><p>z</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'Content after the end tag of the "html" element is not allowed',
			raw: '<p>',
		},
	]);
});

test('[no-content-after-body-011] the end tag of `html` closes `body` whose start tag is omitted', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><title>t</title><p>x</p></html><p>z</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 47,
			message: 'Content after the end tag of the "html" element is not allowed',
			raw: '<p>',
		},
	]);
});

test('[no-content-after-body-012] trailing whitespace after the end tag of `html` that closed `body` is allowed', async () => {
	expect(
		(await mlRuleTest(rule, '<!doctype html><html><head></head><body><p>x</p></html>\n  ')).violations,
	).toStrictEqual([]);
});

test('[no-content-after-body-013] the message names `html` in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<!doctype html><html><head></head><body><p>x</p></html><p>z</p>',
		undefined,
		false,
		'ja',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: '「html」要素の終了タグの後にコンテンツを置くことはできません',
			raw: '<p>',
		},
	]);
});

test('[no-content-after-body-014] a reference to U+0020 after the end tag of body is white space', async () => {
	expect((await mlRuleTest(rule, '<html><body></body>&#32;</html>')).violations).toStrictEqual([]);
});

test.each([
	['\u00A0', '\u00A0'],
	['&nbsp;', '&nbsp;'],
])(
	'[no-content-after-body-015] U+00A0 after the end tag of body is a character, not ASCII white space: %j',
	async (content, raw) => {
		const { violations } = await mlRuleTest(rule, `<html><body></body>${content}</html>`);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message: 'Content after the end tag of the "body" element is not allowed',
				raw,
			},
		]);
	},
);

test('[no-content-after-body-016] text after an orphaned end tag after the end of body', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<!doctype html><html><body><p>a</p></body>b</expected>c<div>x</div></html>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 43,
			message: 'Content after the end tag of the "body" element is not allowed',
			raw: 'b',
		},
		{
			severity: 'error',
			line: 1,
			col: 55,
			message: 'Content after the end tag of the "body" element is not allowed',
			raw: 'c',
		},
		{
			severity: 'error',
			line: 1,
			col: 56,
			message: 'Content after the end tag of the "body" element is not allowed',
			raw: '<div>',
		},
	]);
});

test.each([
	['<!doctype html><body><div></body><p>x</p>', 'Content after the end tag of the "body" element is not allowed'],
	['<!doctype html><body><div></html><p>z</p>', 'Content after the end tag of the "html" element is not allowed'],
])(
	'[no-content-after-body-017] content in an element that is still open at the end of body: %j',
	async (code, message) => {
		const { violations } = await mlRuleTest(rule, code);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 34,
				message,
				raw: '<p>',
			},
		]);
	},
);

test('[no-content-after-body-018] an element still open at the end of body with nothing after the end', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><body><div><p>x</p></body>');
	expect(violations).toStrictEqual([]);
});

test('[no-content-after-body-019] content in an element that the parser makes again after the end of body', async () => {
	const { violations } = await mlRuleTest(rule, '<!doctype html><body><p><b>x</p></body>y');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 40,
			message: 'Content after the end tag of the "body" element is not allowed',
			raw: 'y',
		},
	]);
});

test.each([
	'<!doctype html><body><template><div></body><p>x</p></div></template></body>',
	'<!doctype html><body><table><tr><td>a</body><p>x</p></td></tr></table></body>',
])('[no-content-after-body-020] a `</body>` that the parser ignores closes nothing: %j', async code => {
	const { violations } = await mlRuleTest(rule, code);
	expect(violations).toStrictEqual([]);
});
