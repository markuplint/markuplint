import { testAsyncAndSyncFix, testAsyncAndSyncVerify } from '../test-utils';
import rule from './';

describe('verify', () => {
	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to" src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Required space',
					line: 2,
					col: 21,
					raw: '',
					ruleId: 'attr-spacing',
				},
			],
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': false,
				},
			},
			[rule],
			'en',
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"
		src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('Never line break', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"
		src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'never' },
					},
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'error',
					message: 'Never break line',
					line: 2,
					col: 21,
					raw: '\n\t\t',
					ruleId: 'attr-spacing',
				},
			],
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to" src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'never' },
					},
				},
			},
			[rule],
			'en',
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"
		src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'always' },
					},
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'error',
					message: 'Insert line break',
					line: 2,
					col: 7,
					raw: ' ',
					ruleId: 'attr-spacing',
				},
			],
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src="path/to"
		src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'always' },
					},
				},
			},
			[rule],
			'en',
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"  src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { width: 1 },
					},
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'error',
					message: 'Space should be 1',
					line: 2,
					col: 21,
					raw: '  ',
					ruleId: 'attr-spacing',
				},
			],
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img src="path/to"  src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { width: 2 },
					},
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'error',
					message: 'Space should be 2',
					line: 2,
					col: 7,
					raw: ' ',
					ruleId: 'attr-spacing',
				},
			],
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncVerify(
			`
		<img
		src="path/to"   src="path/to2">
		`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { width: 3 },
					},
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
			<img src="path/to" src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': true,
				},
			},
			[rule],
			'en',
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': true,
				},
			},
			[rule],
			'en',
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': false,
				},
			},
			[rule],
			'en',
			`
			<img src="path/to"src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"
			src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': true,
				},
			},
			[rule],
			'en',
			`
			<img src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"
			src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'never' },
					},
				},
			},
			[rule],
			'en',
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to" src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'never' },
					},
				},
			},
			[rule],
			'en',
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"
			src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'always' },
					},
				},
			},
			[rule],
			'en',
			`
			<img
			src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img
			src="path/to"
			src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { lineBreak: 'always' },
					},
				},
			},
			[rule],
			'en',
			`
			<img
			src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"  src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { width: 1 },
					},
				},
			},
			[rule],
			'en',
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img src="path/to"  src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { width: 2 },
					},
				},
			},
			[rule],
			'en',
			`
			<img  src="path/to"  src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		await testAsyncAndSyncFix(
			`
			<img
			src="path/to"   src="path/to2">
			`,
			{
				rules: {
					'attr-spacing': {
						severity: 'error',
						value: true,
						option: { width: 3 },
					},
				},
			},
			[rule],
			'en',
			`
			<img
			src="path/to"   src="path/to2">
			`,
		);
	});
});
