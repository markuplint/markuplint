import * as markuplint from 'markuplint';
import rule from './';

test('is test 1', async () => {
	const r = await markuplint.verify(
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
	);

	expect(r).toStrictEqual([
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
	]);
});

test('is test 2', async () => {
	const r = await markuplint.verify(
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
	);

	expect(r).toStrictEqual([
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
	]);
});

test('is test 3', async () => {
	const r = await markuplint.verify(
		'<img src="/" SRC="/" >',
		{
			rules: {
				'attr-duplication': true,
			},
		},
		[rule],
		'ja',
	);

	expect(r.map(_ => _.message)).toStrictEqual(['属性名が重複しています']);
});

test('nodeRules disable', async () => {
	const r = await markuplint.verify(
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

	expect(r.length).toStrictEqual(0);
});
