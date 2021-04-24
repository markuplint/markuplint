import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('deprecated attribute', async () => {
	await testAsyncAndSyncVerify(
		'<img align="top">',
		{
			rules: {
				'deprecated-attr': true,
			},
		},
		[rule],
		'en',
	[
		{
			ruleId: 'deprecated-attr',
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'align',
			message: 'The align attribute is obsolete',
		},
	]);
});

test('deprecated global attribute', async () => {
	await testAsyncAndSyncVerify(
		'<img xml:lang="en-US">',
		{
			rules: {
				'deprecated-attr': true,
			},
		},
		[rule],
		'en',
	[
		{
			ruleId: 'deprecated-attr',
			severity: 'error',
			line: 1,
			col: 6,
			raw: 'xml:lang',
			message: 'The xml:lang attribute is deprecated',
		},
	]);
});
