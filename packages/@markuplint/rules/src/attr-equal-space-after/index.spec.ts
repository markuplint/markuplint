import { testAsyncAndSyncFix, testAsyncAndSyncVerify } from '../test-utils';
import rule from './';

describe('verify', () => {
	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('space before and after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src = "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' = ',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('space before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src ="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('space after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src= "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: '= ',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('line break before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src
		="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('line break after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src=
		"path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space after equal sign of attribute',
					line: 3,
					col: 6,
					raw: '=\n\t\t',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always: no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: '=',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always: space before and after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src = "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always',
				},
			},
			[rule],
			'en',
		);
	});

	test('always: space before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src ="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' =',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always: space after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src= "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always',
				},
			},
			[rule],
			'en',
		);
	});

	test('always: line break before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src
		="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 3,
					col: 6,
					raw: '\n\t\t=',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always: line break after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src=
		"path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always',
				},
			},
			[rule],
			'en',
		);
	});

	test('always-single-line: no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: '=',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always-single-line: space before and after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src = "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always-single-line',
				},
			},
			[rule],
			'en',
		);
	});

	test('always-single-line: space before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src ="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' =',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always-single-line: space after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src= "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always-single-line',
				},
			},
			[rule],
			'en',
		);
	});

	test('always-single-line: line break before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src
		="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 3,
					col: 6,
					raw: '\n\t\t=',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('always: line break after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src=
		"path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'always-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space after equal sign of attribute',
					line: 3,
					col: 6,
					raw: '=\n\t\t',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('never-single-line: no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'never-single-line',
				},
			},
			[rule],
			'en',
		);
	});

	test('never-single-line: space before and after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src = "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'never-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' = ',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('never-single-line: space before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src ="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'never-single-line',
				},
			},
			[rule],
			'en',
		);
	});

	test('never-single-line: space after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src= "path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'never-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space after equal sign of attribute',
					line: 2,
					col: 11,
					raw: '= ',
					ruleId: 'attr-equal-space-after',
				},
			],
		);
	});

	test('never-single-line: line break before', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src
		="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'never-single-line',
				},
			},
			[rule],
			'en',
		);
	});

	test('never-single-line: line break after', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src=
		"path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': 'never-single-line',
				},
			},
			[rule],
			'en',
		);
	});
});

describe('fix', () => {
	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
		<img src="path/to">
		`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			`
		<img src="path/to">
		`,
		);
	});

	test('space before and after', async () => {
		await testAsyncAndSyncFix(
			`
			<img src = "path/to">
			`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			`
			<img src ="path/to">
			`,
		);
	});

	test('space before', async () => {
		await testAsyncAndSyncFix(
			`
			<img src ="path/to">
			`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			`
			<img src ="path/to">
			`,
		);
	});

	test('space after', async () => {
		await testAsyncAndSyncFix(
			`
			<img src= "path/to">
			`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			`
			<img src="path/to">
			`,
		);
	});

	test('line break before', async () => {
		await testAsyncAndSyncFix(
			`
			<img
			src
			="path/to">
			`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			`
			<img
			src
			="path/to">
			`,
		);
	});

	test('line break after', async () => {
		await testAsyncAndSyncFix(
			`
			<img
			src=
			"path/to">
			`,
			{
				rules: {
					'attr-equal-space-after': true,
				},
			},
			[rule],
			'en',
			`
			<img
			src="path/to">
			`,
		);
	});

	// test('always: no-space', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 	);
	// });

	// test('always: space before and after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 	);
	// });

	// test('always: space before', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src ="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 	);
	// });

	// test('always: space after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 	);
	// });

	// test('always: line break before', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img
	// 		src
	// 		="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img
	// 		src
	// 		= "path/to">
	// 		`,
	// 	);
	// });

	// test('always: line break after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img
	// 		src=
	// 		"path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img
	// 		src=
	// 		"path/to">
	// 		`,
	// 	);
	// });

	// test('always-single-line: no-space', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 	);
	// });

	// test('always-single-line: space before and after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 	);
	// });

	// test('always-single-line: space before', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src ="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 	);
	// });

	// test('always-single-line: space after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 	);
	// });

	// test('always-single-line: line break before', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img
	// 		src
	// 		="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img
	// 		src
	// 		= "path/to">
	// 		`,
	// 	);
	// });

	// test('always: line break after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img
	// 		src=
	// 		"path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'always-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img
	// 		src= "path/to">
	// 		`,
	// 	);
	// });

	// test('never-single-line: no-space', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'never-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src="path/to">
	// 		`,
	// 	);
	// });

	// test('never-single-line: space before and after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src = "path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'never-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src ="path/to">
	// 		`,
	// 	);
	// });

	// test('never-single-line: space before', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src ="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'never-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src ="path/to">
	// 		`,
	// 	);
	// });

	// test('never-single-line: space after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img src= "path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'never-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img src="path/to">
	// 		`,
	// 	);
	// });

	// test('never-single-line: line break before', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img
	// 		src
	// 		="path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'never-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img
	// 		src
	// 		="path/to">
	// 		`,
	// 	);
	// });

	// test('never-single-line: line break after', async () => {
	// 	const r = await markuplint.fix(
	// 		`
	// 		<img
	// 		src=
	// 		"path/to">
	// 		`,
	// 		{
	// 			rules: {
	// 				'attr-equal-space-after': 'never-single-line',
	// 			},
	// 		},
	// 		[rule],
	// 		'en',
	// 	);
	// 	t.is(
	// 		r,
	// 		`
	// 		<img
	// 		src=
	// 		"path/to">
	// 		`,
	// 	);
	// });
});
