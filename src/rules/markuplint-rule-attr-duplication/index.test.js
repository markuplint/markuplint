import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-attr-duplication';

const rule = new CustomRule();

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
				"attr-duplication": true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Duplicate attribute name',
			line: 2,
			col: 25,
			raw: 'data-Attr=\'db\'',
		},
		{
			level: 'error',
			message: 'Duplicate attribute name',
			line: 2,
			col: 40,
			raw: 'data-attR=tr',
		}
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
				"attr-duplication": true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Duplicate attribute name',
			line: 4,
			col: 3,
			raw: 'data-Attr=\'db\'',
		},
		{
			level: 'error',
			message: 'Duplicate attribute name',
			line: 5,
			col: 3,
			raw: 'data-attR=tr',
		}
	]);
});

test('attr-duplication', async t => {
	const r = await markuplint.verify(
		`<img src="/" SRC="/" >`,
		{
			rules: {
				"attr-duplication": true,
			},
		},
		[rule],
		'ja',
	);
	t.deepEqual(r.map(_ => _.message), [
		'属性名が重複しています。',
		'属性名が重複しています。',
	]);
});

test('noop', t => t.pass());
