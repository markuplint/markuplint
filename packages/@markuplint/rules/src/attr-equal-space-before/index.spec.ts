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
					'attr-equal-space-before': true,
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' = ',
					ruleId: 'attr-equal-space-before',
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' =',
					ruleId: 'attr-equal-space-before',
				},
			],
		);
	});

	test('space after', async () => {
		await testAsyncAndSyncVerify(
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space before equal sign of attribute',
					line: 3,
					col: 6,
					raw: '\n\t\t=',
					ruleId: 'attr-equal-space-before',
				},
			],
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('always: no-space', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: '=',
					ruleId: 'attr-equal-space-before',
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
					'attr-equal-space-before': 'always',
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
					'attr-equal-space-before': 'always',
				},
			},
			[rule],
			'en',
		);
	});

	test('always: space after', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: '= ',
					ruleId: 'attr-equal-space-before',
				},
			],
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
					'attr-equal-space-before': 'always',
				},
			},
			[rule],
			'en',
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
					'attr-equal-space-before': 'always',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 3,
					col: 6,
					raw: '=\n\t\t',
					ruleId: 'attr-equal-space-before',
				},
			],
		);
	});

	test('always-single-line: no-space', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: '=',
					ruleId: 'attr-equal-space-before',
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
					'attr-equal-space-before': 'always-single-line',
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
					'attr-equal-space-before': 'always-single-line',
				},
			},
			[rule],
			'en',
		);
	});

	test('always-single-line: space after', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: '= ',
					ruleId: 'attr-equal-space-before',
				},
			],
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
					'attr-equal-space-before': 'always-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 3,
					col: 6,
					raw: '\n\t\t=',
					ruleId: 'attr-equal-space-before',
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
					'attr-equal-space-before': 'always-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Always insert space before equal sign of attribute',
					line: 3,
					col: 6,
					raw: '=\n\t\t',
					ruleId: 'attr-equal-space-before',
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
					'attr-equal-space-before': 'never-single-line',
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
					'attr-equal-space-before': 'never-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' = ',
					ruleId: 'attr-equal-space-before',
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
					'attr-equal-space-before': 'never-single-line',
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Never insert space before equal sign of attribute',
					line: 2,
					col: 11,
					raw: ' =',
					ruleId: 'attr-equal-space-before',
				},
			],
		);
	});

	test('never-single-line: space after', async () => {
		await testAsyncAndSyncVerify(
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
					'attr-equal-space-before': 'never-single-line',
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
					'attr-equal-space-before': 'never-single-line',
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
					'attr-equal-space-before': true,
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
			`
		<img src= "path/to">
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
			`
		<img src="path/to">
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
					'attr-equal-space-before': true,
				},
			},
			[rule],
			'en',
			`
		<img src= "path/to">
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
					'attr-equal-space-before': true,
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

	test('line break after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src=
		"path/to">
		`,
		);
	});

	test('always: no-space', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src ="path/to">
		`,
		);
	});

	test('always: space before and after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src = "path/to">
		`,
		);
	});

	test('always: space before', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src ="path/to">
		`,
		);
	});

	test('always: space after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src = "path/to">
		`,
		);
	});

	test('always: line break before', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src
		="path/to">
		`,
		);
	});

	test('always: line break after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src =
		"path/to">
		`,
		);
	});

	test('always-single-line: no-space', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src ="path/to">
		`,
		);
	});

	test('always-single-line: space before and after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src = "path/to">
		`,
		);
	});

	test('always-single-line: space before', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src ="path/to">
		`,
		);
	});

	test('always-single-line: space after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src = "path/to">
		`,
		);
	});

	test('always-single-line: line break before', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src ="path/to">
		`,
		);
	});

	test('always: line break after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src =
		"path/to">
		`,
		);
	});

	test('never-single-line: no-space', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src="path/to">
		`,
		);
	});

	test('never-single-line: space before and after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src= "path/to">
		`,
		);
	});

	test('never-single-line: space before', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src="path/to">
		`,
		);
	});

	test('never-single-line: space after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img src= "path/to">
		`,
		);
	});

	test('never-single-line: line break before', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src
		="path/to">
		`,
		);
	});

	test('never-single-line: line break after', async () => {
		await testAsyncAndSyncFix(
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
			`
		<img
		src=
		"path/to">
		`,
		);
	});
});
