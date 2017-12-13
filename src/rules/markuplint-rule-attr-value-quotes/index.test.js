import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-attr-value-quotes';

const rule = new CustomRule();

test('default', async t => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"attr-value-quotes": true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 26,
			raw: 'data-Attr=\'db\'',
		},
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
		}
	]);
});

test('double', async t => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"attr-value-quotes": ['error', 'double'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 26,
			raw: 'data-Attr=\'db\'',
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
		}
	]);
});

test('single', async t => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"attr-value-quotes": ['error', 'single'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Attribute value is must quote on single quotation mark',
			line: 2,
			col: 8,
			raw: 'data-attr="value"',
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on single quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
		}
	]);
});

test('empty', async t => {
	const r = await markuplint.verify(
		`
		<div data-attr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				"attr-value-quotes": true,
			},
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', t => t.pass());
