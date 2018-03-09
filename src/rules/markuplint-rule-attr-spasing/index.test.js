import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-attr-spasing';

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to" src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'スペースが必要です',
			line: 2,
			col: 21,
			raw: '',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': false,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { lineBreak: 'never' }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: '改行はしないでください',
			line: 2,
			col: 21,
			raw: '\n\t\t',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to" src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { lineBreak: 'never' }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { lineBreak: 'always' }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: '改行してください',
			line: 2,
			col: 7,
			raw: ' ',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { lineBreak: 'always' }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"  src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { width: 1 }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'スペースは1つにしてください',
			line: 2,
			col: 21,
			raw: '  ',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to"  src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { width: 2 }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'スペースは2つにしてください',
			line: 2,
			col: 7,
			raw: ' ',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src="path/to"   src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': ['error', true, { width: 3 }],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('noop', (t) => t.pass());
