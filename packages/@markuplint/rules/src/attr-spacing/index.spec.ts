import { mlRuleTest } from 'markuplint';

import rule from '.';

describe('verify', () => {
	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to" src="path/to2">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"src="path/to2">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Required space',
				line: 2,
				col: 21,
				raw: '',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"src="path/to2">
		`,
			{ rule: false },
		);
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"
		src="path/to2">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([]);
	});

	test('Never line break', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"
		src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'never' },
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Never break line',
				line: 2,
				col: 21,
				raw: '\n\t\t',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to" src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'never' },
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"
		src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'always' },
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Insert line break',
				line: 2,
				col: 7,
				raw: ' ',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src="path/to"
		src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'always' },
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"  src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { width: 1 },
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Space should be one',
				line: 2,
				col: 21,
				raw: '  ',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to"  src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { width: 2 },
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Space should be two',
				line: 2,
				col: 7,
				raw: ' ',
			},
		]);
	});

	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src="path/to"   src="path/to2">
		`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { width: 3 },
				},
			},
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('fix', () => {
	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to" src="path/to2">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"src="path/to2">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"src="path/to2">
			`,
			{ rule: false },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to"src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"
			src="path/to2">
			`,
			{ rule: true },
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
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"
			src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'never' },
				},
			},
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to" src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'never' },
				},
			},
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"
			src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'always' },
				},
			},
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
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img
			src="path/to"
			src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { lineBreak: 'always' },
				},
			},
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
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"  src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { width: 1 },
				},
			},
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to" src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src="path/to"  src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { width: 2 },
				},
			},
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img  src="path/to"  src="path/to2">
			`,
		);
	});

	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img
			src="path/to"   src="path/to2">
			`,
			{
				rule: {
					severity: 'error',
					value: true,
					option: { width: 3 },
				},
			},
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
