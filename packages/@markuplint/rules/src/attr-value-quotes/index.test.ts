import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-attr-value-quotes';

test('default', async (t) => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				'attr-value-quotes': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 26,
			raw: 'data-Attr=\'db\'',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test('double', async (t) => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				'attr-value-quotes': ['error', 'double'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 26,
			raw: 'data-Attr=\'db\'',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test('single', async (t) => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				'attr-value-quotes': ['error', 'single'],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'Attribute value is must quote on single quotation mark',
			line: 2,
			col: 8,
			raw: 'data-attr="value"',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'error',
			severity: 'error',
			message: 'Attribute value is must quote on single quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test('empty', async (t) => {
	const r = await markuplint.verify(
		`
		<div data-attr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				'attr-value-quotes': true,
			},
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('empty', async (t) => {
	const r = await markuplint.fix(
		'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
		{
			rules: {
				'attr-value-quotes': true,
			},
		},
		[rule],
		'en',
	);
	t.is(r, '<div attr noop="noop" foo="bar" hoge="fuga">');
});

test('empty', async (t) => {
	const r = await markuplint.fix(
		'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
		{
			rules: {
				'attr-value-quotes': 'single',
			},
		},
		[rule],
		'en',
	);
	t.is(r, "<div attr noop='noop' foo='bar' hoge='fuga'>");
});

test('noop', (t) => t.pass());
