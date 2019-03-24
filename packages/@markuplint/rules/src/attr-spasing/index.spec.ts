import * as markuplint from 'markuplint';
import rule from './';

test('no-space', async () => {
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
	expect(r).toStrictEqual([]);
});

test('no-space', async () => {
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
	expect(r).toStrictEqual([
		{
			severity: 'warning',
			message: 'スペースが必要です',
			line: 2,
			col: 21,
			raw: '',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async () => {
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
	expect(r).toStrictEqual([]);
});

test('no-space', async () => {
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
	expect(r).toStrictEqual([]);
});

test('Never line break', async () => {
	const r = await markuplint.verify(
		`
		<img src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { lineBreak: 'never' },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '改行はしないでください',
			line: 2,
			col: 21,
			raw: '\n\t\t',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async () => {
	const r = await markuplint.verify(
		`
		<img src="path/to" src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { lineBreak: 'never' },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([]);
});

test('no-space', async () => {
	const r = await markuplint.verify(
		`
		<img src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { lineBreak: 'always' },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '改行してください',
			line: 2,
			col: 7,
			raw: ' ',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async () => {
	const r = await markuplint.verify(
		`
		<img
		src="path/to"
		src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { lineBreak: 'always' },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([]);
});

test('no-space', async () => {
	const r = await markuplint.verify(
		`
		<img src="path/to"  src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { width: 1 },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'スペースは1つにしてください',
			line: 2,
			col: 21,
			raw: '  ',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async () => {
	const r = await markuplint.verify(
		`
		<img src="path/to"  src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { width: 2 },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'スペースは2つにしてください',
			line: 2,
			col: 7,
			raw: ' ',
			ruleId: 'attr-spasing',
		},
	]);
});

test('no-space', async () => {
	const r = await markuplint.verify(
		`
		<img
		src="path/to"   src="path/to2">
		`,
		{
			rules: {
				'attr-spasing': {
					severity: 'error',
					value: true,
					option: { width: 3 },
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([]);
});

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': false,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to"src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"
// 		src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to"
// 		src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"
// 		src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { lineBreak: 'never' }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { lineBreak: 'never' }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"
// 		src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { lineBreak: 'always' }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img
// 		src="path/to"
// 		src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img
// 		src="path/to"
// 		src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { lineBreak: 'always' }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img
// 		src="path/to"
// 		src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"  src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { width: 1 }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img src="path/to" src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img src="path/to"  src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { width: 2 }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img  src="path/to"  src="path/to2">
// 		`,
// 	);
// });

// test('no-space', async () => {
// 	const r = await markuplint.fix(
// 		`
// 		<img
// 		src="path/to"   src="path/to2">
// 		`,
// 		{
// 			rules: {
// 				'attr-spasing': ['error', true, { width: 3 }],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.is(
// 		r,
// 		`
// 		<img
// 		src="path/to"   src="path/to2">
// 		`,
// 	);
// });
