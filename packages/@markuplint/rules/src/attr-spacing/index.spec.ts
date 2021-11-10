import { mlTest } from 'markuplint';

import rule from '.';

describe('verify', () => {
	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Required space',
				line: 2,
				col: 21,
				raw: '',
				ruleId: 'attr-spacing',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('Never line break', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Never break line',
				line: 2,
				col: 21,
				raw: '\n\t\t',
				ruleId: 'attr-spacing',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Insert line break',
				line: 2,
				col: 7,
				raw: ' ',
				ruleId: 'attr-spacing',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Space should be 1',
				line: 2,
				col: 21,
				raw: '  ',
				ruleId: 'attr-spacing',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Space should be 2',
				line: 2,
				col: 7,
				raw: ' ',
				ruleId: 'attr-spacing',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});
});

describe('fix', () => {
	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to"src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img
			src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img
			src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img  src="path/to"  src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img
			src="path/to"   src="path/to2">
			`,
		);
	});
});
