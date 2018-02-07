import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-attr-equal-spasing';

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src = "path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'never',
			line: 2,
			col: 8,
			raw: 'src = "path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src= "path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'never',
			line: 2,
			col: 8,
			raw: 'src= "path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src ="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'never',
			line: 2,
			col: 8,
			raw: 'src ="path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always',
			line: 2,
			col: 8,
			raw: 'src="path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src= "path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always',
			line: 2,
			col: 8,
			raw: 'src= "path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src ="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always',
			line: 2,
			col: 8,
			raw: 'src ="path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
		<img src = "path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('attr-equal-spasing', async (t) => {
	const r = await markuplint.verify(
		`
<img src
="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always',
			line: 2,
			col: 6,
			raw: 'src\n="path/to"',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

// test('attr-equal-spasing', async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 		<img src=
// 		"path/to">
// 		`,
// 		{
// 			rules: {
// 				'attr-equal-spasing': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			severity: 'error',
// 			message: 'Duplicate attribute name',
// 			line: 2,
// 			col: 26,
// 			raw: 'data-Attr=\'db\'',
// 			ruleId: 'attr-equal-spasing',
// 		},
// 		{
// 			level: 'error',
// 			severity: 'error',
// 			message: 'Duplicate attribute name',
// 			line: 2,
// 			col: 41,
// 			raw: 'data-attR=tr',
// 			ruleId: 'attr-equal-spasing',
// 		},
// 	]);
// });

// test('attr-equal-spasing', async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 		<img src
// 		="path/to">
// 		`,
// 		{
// 			rules: {
// 				'attr-equal-spasing': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			severity: 'error',
// 			message: 'Duplicate attribute name',
// 			line: 2,
// 			col: 26,
// 			raw: 'data-Attr=\'db\'',
// 			ruleId: 'attr-equal-spasing',
// 		},
// 		{
// 			level: 'error',
// 			severity: 'error',
// 			message: 'Duplicate attribute name',
// 			line: 2,
// 			col: 41,
// 			raw: 'data-attR=tr',
// 			ruleId: 'attr-equal-spasing',
// 		},
// 	]);
// });

test('noop', (t) => t.pass());
