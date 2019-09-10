import * as markuplint from 'markuplint';
import rule from '.';

describe('verify', () => {
	test('no-space', async () => {
		const r = await markuplint.verify(
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
		expect(r).toStrictEqual([]);
	});

	test('no-space', async () => {
		const r = await markuplint.verify(
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
		expect(r).toStrictEqual([
			{
				severity: 'warning',
				message: 'スペースが必要です',
				line: 2,
				col: 21,
				raw: '',
				ruleId: 'attr-spacing',
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
					'attr-spacing': false,
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
					'attr-spacing': true,
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
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: '改行はしないでください',
				line: 2,
				col: 21,
				raw: '\n\t\t',
				ruleId: 'attr-spacing',
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
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: '改行してください',
				line: 2,
				col: 7,
				raw: ' ',
				ruleId: 'attr-spacing',
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
		expect(r).toStrictEqual([]);
	});

	test('no-space', async () => {
		const r = await markuplint.verify(
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
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: 'スペースは1つにしてください',
				line: 2,
				col: 21,
				raw: '  ',
				ruleId: 'attr-spacing',
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
		expect(r).toStrictEqual([
			{
				severity: 'error',
				message: 'スペースは2つにしてください',
				line: 2,
				col: 7,
				raw: ' ',
				ruleId: 'attr-spacing',
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
		expect(r).toStrictEqual([]);
	});
});

describe('fix', () => {
	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to"src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img
			src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img
			src="path/to"
			src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img  src="path/to"  src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const r = await markuplint.fix(
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
		expect(r).toEqual(
			`
			<img
			src="path/to"   src="path/to2">
			`,
		);
	});
});
