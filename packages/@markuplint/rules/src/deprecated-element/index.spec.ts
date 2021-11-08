import { mlTest } from 'markuplint';
import rule from './';

test('normal', async () => {
	const { violations } = await mlTest(
		'<div></div><p><span></span></p>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([]);
});

test('deprecated', async () => {
	const { violations } = await mlTest(
		'<font></font><big><blink></blink></big>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "font" element is deprecated',
			line: 1,
			col: 1,
			raw: '<font>',
			ruleId: 'deprecated-element',
		},
		{
			severity: 'error',
			message: 'The "big" element is deprecated',
			line: 1,
			col: 14,
			raw: '<big>',
			ruleId: 'deprecated-element',
		},
		{
			severity: 'error',
			message: 'The "blink" element is deprecated',
			line: 1,
			col: 19,
			raw: '<blink>',
			ruleId: 'deprecated-element',
		},
	]);
});

test('Foreign element', async () => {
	const { violations } = await mlTest(
		'<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	const { violations: violations2 } = await mlTest(
		'<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([]);
	expect(violations2).toStrictEqual([
		{
			ruleId: 'deprecated-element',
			severity: 'error',
			line: 1,
			col: 12,
			raw: '<image width="100" height="100" xlink:href="path/to"/>',
			message: 'The "image" element is deprecated',
		},
	]);
});

test('svg', async () => {
	const { violations } = await mlTest(
		'<svg><altGlyph>text</altGlyph></svg>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "altGlyph" element is deprecated',
			line: 1,
			col: 6,
			raw: '<altGlyph>',
			ruleId: 'deprecated-element',
		},
	]);
});
