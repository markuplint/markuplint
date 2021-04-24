import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('normal', async () => {
	await testAsyncAndSyncVerify(
		'<div></div><p><span></span></p>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
});

test('deprecated', async () => {
	await testAsyncAndSyncVerify(
		'<font></font><big><blink></blink></big>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Element is deprecated',
				line: 1,
				col: 1,
				raw: '<font>',
				ruleId: 'deprecated-element',
			},
			{
				severity: 'error',
				message: 'Element is deprecated',
				line: 1,
				col: 14,
				raw: '<big>',
				ruleId: 'deprecated-element',
			},
			{
				severity: 'error',
				message: 'Element is deprecated',
				line: 1,
				col: 19,
				raw: '<blink>',
				ruleId: 'deprecated-element',
			},
		],
	);
});

test('Foreign element', async () => {
	await testAsyncAndSyncVerify(
		'<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
	);
	await testAsyncAndSyncVerify(
		'<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>',
		{
			rules: {
				'deprecated-element': true,
			},
		},
		[rule],
		'en',
		[
			{
				ruleId: 'deprecated-element',
				severity: 'error',
				line: 1,
				col: 12,
				raw: '<image width="100" height="100" xlink:href="path/to"/>',
				message: 'Element is deprecated',
			},
		],
	);
});
