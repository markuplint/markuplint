import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('is test 1', async () => {
	await testAsyncAndSyncVerify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
	`,
		{
			rules: {
				'attr-duplication': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Duplicate attribute name',
				line: 2,
				col: 26,
				raw: 'data-Attr',
				ruleId: 'attr-duplication',
			},
			{
				severity: 'error',
				message: 'Duplicate attribute name',
				line: 2,
				col: 41,
				raw: 'data-attR',
				ruleId: 'attr-duplication',
			},
		],
	);
});

test('is test 2', async () => {
	await testAsyncAndSyncVerify(
		`
		<div
			data-attr="value"
			data-Attr='db'
			data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
	`,
		{
			rules: {
				'attr-duplication': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Duplicate attribute name',
				line: 4,
				col: 4,
				raw: 'data-Attr',
				ruleId: 'attr-duplication',
			},
			{
				severity: 'error',
				message: 'Duplicate attribute name',
				line: 5,
				col: 4,
				raw: 'data-attR',
				ruleId: 'attr-duplication',
			},
		],
	);
});

test('is test 3', async () => {
	await testAsyncAndSyncVerify(
		'<img src="/" SRC="/" >',
		{
			rules: {
				'attr-duplication': true,
			},
		},
		[rule],
		'ja',
		['属性名が重複しています'],
		r => r.map(_ => _.message),
	);
});

test('nodeRules disable', async () => {
	await testAsyncAndSyncVerify(
		'<div><span attr attr></span></div>',
		{
			rules: {
				'attr-duplication': true,
			},
			nodeRules: [
				{
					selector: 'span',
					rules: {
						'attr-duplication': false,
					},
				},
			],
		},
		[rule],
		'en',
	);
});
