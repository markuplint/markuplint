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
