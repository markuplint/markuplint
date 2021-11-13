import { mlRuleTest } from 'markuplint';

import rule from './';

test('normal', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div><p><span></span></p>', { rule: true });
	expect(violations).toStrictEqual([]);
});

test('deprecated', async () => {
	const { violations } = await mlRuleTest(rule, '<font></font><big><blink></blink></big>', { rule: true });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "font" element is deprecated',
			line: 1,
			col: 1,
			raw: '<font>',
		},
		{
			severity: 'error',
			message: 'The "big" element is deprecated',
			line: 1,
			col: 14,
			raw: '<big>',
		},
		{
			severity: 'error',
			message: 'The "blink" element is deprecated',
			line: 1,
			col: 19,
			raw: '<blink>',
		},
	]);
});

test('Foreign element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>',
		{ rule: true },
	);
	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>',
		{ rule: true },
	);
	expect(violations).toStrictEqual([]);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			raw: '<image width="100" height="100" xlink:href="path/to"/>',
			message: 'The "image" element is deprecated',
		},
	]);
});

test('svg', async () => {
	const { violations } = await mlRuleTest(rule, '<svg><altGlyph>text</altGlyph></svg>', { rule: true });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "altGlyph" element is deprecated',
			line: 1,
			col: 6,
			raw: '<altGlyph>',
		},
	]);
});
