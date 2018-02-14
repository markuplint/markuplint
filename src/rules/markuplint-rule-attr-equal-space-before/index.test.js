import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-attr-equal-space-before';

test('no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': true,
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
				'attr-equal-space-before': true,
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': true,
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': true,
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
				'attr-equal-space-before': true,
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': true,
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
				'attr-equal-space-before': 'always',
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': 'always',
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
				'attr-equal-space-before': 'always',
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
				'attr-equal-space-before': 'always',
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': 'always',
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
				'attr-equal-space-before': 'always',
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': 'always-single-line',
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': 'always-single-line',
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
				'attr-equal-space-before': 'always-single-line',
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
				'attr-equal-space-before': 'always-single-line',
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': 'always-single-line',
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
			ruleId: 'attr-equal-space-before',
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
				'attr-equal-space-before': 'always-single-line',
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
			ruleId: 'attr-equal-space-before',
		},
	]);
});

test('never-single-line: no-space', async (t) => {
	const r = await markuplint.verify(
		`
		<img src="path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': 'never-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
	]);
});

test('never-single-line: space before and after', async (t) => {
	const r = await markuplint.verify(
		`
		<img src = "path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': 'never-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'never-single-line',
			line: 2,
			col: 11,
			raw: ' = ',
			ruleId: 'attr-equal-space-before',
		},
	]);
});

test('never-single-line: space before', async (t) => {
	const r = await markuplint.verify(
		`
		<img src ="path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': 'never-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'never-single-line',
			line: 2,
			col: 11,
			raw: ' =',
			ruleId: 'attr-equal-space-before',
		},
	]);
});

test('never-single-line: space after', async (t) => {
	const r = await markuplint.verify(
		`
		<img src= "path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': 'never-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('never-single-line: line break before', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src
		="path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': 'never-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('never-single-line: line break after', async (t) => {
	const r = await markuplint.verify(
		`
		<img
		src=
		"path/to">
		`,
		{
			rules: {
				'attr-equal-space-before': 'never-single-line',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('noop', (t) => t.pass());
