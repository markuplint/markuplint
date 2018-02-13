import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-attr-equal-spasing';

test('no-space', async (t) => {
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

test('space before and after', async (t) => {
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
			col: 11,
			raw: ' = ',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('space before', async (t) => {
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
			col: 11,
			raw: ' =',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('space after', async (t) => {
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
	t.deepEqual(r, []);
});

test('line break before', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src
		="path/to">
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
			line: 3,
			col: 6,
			raw: '\n\t\t=',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('line break after', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src=
		"path/to">
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

test('always: no-space', async (t) => {
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
			col: 11,
			raw: '=',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('always: space before and after', async (t) => {
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

test('always: space before', async (t) => {
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
	t.deepEqual(r, []);
});

test('always: space after', async (t) => {
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
			col: 11,
			raw: '= ',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('always: line break before', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src
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
	t.deepEqual(r, []);
});

test('always: line break after', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src=
		"path/to">
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
			line: 3,
			col: 6,
			raw: '=\n\t\t',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('always-single-line: no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always-single-line',
			line: 2,
			col: 11,
			raw: '=',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('always-single-line: space before and after', async (t) => {
	const r = await markuplint.verify(
		`
		<img src = "path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('always-single-line: space before', async (t) => {
	const r = await markuplint.verify(
		`
		<img src ="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('always-single-line: space after', async (t) => {
	const r = await markuplint.verify(
		`
		<img src= "path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always-single-line',
			line: 2,
			col: 11,
			raw: '= ',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('always-single-line: line break before', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src
		="path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always-single-line',
			line: 3,
			col: 6,
			raw: '\n\t\t=',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('always: line break after', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src=
		"path/to">
		`,
		{
			rules: {
				'attr-equal-spasing': 'always-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'always-single-line',
			line: 3,
			col: 6,
			raw: '=\n\t\t',
			ruleId: 'attr-equal-spasing',
		},
	]);
});

test('noop', (t) => t.pass());
