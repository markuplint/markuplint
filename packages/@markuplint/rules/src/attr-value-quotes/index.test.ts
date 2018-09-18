import * as markuplint from 'markuplint';
import rule from './';

test('default', async () => {
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
	expect(r).toStrictEqual([
		{
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 26,
			raw: "data-Attr='db'",
			ruleId: 'attr-value-quotes',
		},
		{
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test('double', async () => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				'attr-value-quotes': {
					severity: 'error',
					value: 'double',
					option: null,
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 26,
			raw: "data-Attr='db'",
			ruleId: 'attr-value-quotes',
		},
		{
			severity: 'error',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test('single', async () => {
	const r = await markuplint.verify(
		`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		{
			rules: {
				'attr-value-quotes': {
					severity: 'error',
					value: 'single',
					option: null,
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Attribute value is must quote on single quotation mark',
			line: 2,
			col: 8,
			raw: 'data-attr="value"',
			ruleId: 'attr-value-quotes',
		},
		{
			severity: 'error',
			message: 'Attribute value is must quote on single quotation mark',
			line: 2,
			col: 41,
			raw: 'data-attR=tr',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test('empty', async () => {
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
	expect(r.length).toBe(0);
});

// test('empty', async () => {
// 	const r = await markuplint.fix(
// 		'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
// 		{
// 			rules: {
// 				'attr-value-quotes': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(r, '<div attr noop="noop" foo="bar" hoge="fuga">');
// });

// test('empty', async () => {
// 	const r = await markuplint.fix(
// 		'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
// 		{
// 			rules: {
// 				'attr-value-quotes': 'single',
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(r, "<div attr noop='noop' foo='bar' hoge='fuga'>");
// });
