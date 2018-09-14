import * as markuplint from 'markuplint';
import rule from './';

test('attr-duplication', async t => {
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
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Duplicate attribute name',
			line: 2,
			col: 26,
			raw: "data-Attr='db'",
			ruleId: 'attr-duplication',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Duplicate attribute name',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-duplication',
		},
	]);
});

test('attr-duplication', async t => {
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
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Duplicate attribute name',
			line: 4,
			col: 4,
			raw: "data-Attr='db'",
			ruleId: 'attr-duplication',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Duplicate attribute name',
			line: 5,
			col: 4,
			raw: 'data-attR=tr',
			ruleId: 'attr-duplication',
		},
	]);
});

test('attr-duplication', async t => {
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
	t.deepEqual(r.map(_ => _.message), ['属性名が重複しています。']);
});

test('noop', t => t.pass());
