import { mlRuleTest } from 'markuplint';

import rule from './';

describe('verify', () => {
	test('no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([]);
	});

	test('space before and after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src = "path/to">
		`,
			{ rule: true },
		);

		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' = ',
			},
		]);
	});

	test('space before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src ="path/to">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([]);
	});

	test('space after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src= "path/to">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '= ',
			},
		]);
	});

	test('line break before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src
		="path/to">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([]);
	});

	test('line break after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src=
		"path/to">
		`,
			{ rule: true },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '=\n\t\t',
			},
		]);
	});

	test('always: no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to">
		`,
			{ rule: 'always' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '=',
			},
		]);
	});

	test('always: space before and after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src = "path/to">
		`,
			{ rule: 'always' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('always: space before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src ="path/to">
		`,
			{ rule: 'always' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' =',
			},
		]);
	});

	test('always: space after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src= "path/to">
		`,
			{ rule: 'always' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('always: line break before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src
		="path/to">
		`,
			{ rule: 'always' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '\n\t\t=',
			},
		]);
	});

	test('always: line break after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src=
		"path/to">
		`,
			{ rule: 'always' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('always-single-line: no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to">
		`,
			{ rule: 'always-single-line' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '=',
			},
		]);
	});

	test('always-single-line: space before and after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src = "path/to">
		`,
			{ rule: 'always-single-line' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('always-single-line: space before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src ="path/to">
		`,
			{ rule: 'always-single-line' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' =',
			},
		]);
	});

	test('always-single-line: space after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src= "path/to">
		`,
			{ rule: 'always-single-line' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('always-single-line: line break before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src
		="path/to">
		`,
			{ rule: 'always-single-line' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '\n\t\t=',
			},
		]);
	});

	test('always: line break after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src=
		"path/to">
		`,
			{ rule: 'always-single-line' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '=\n\t\t',
			},
		]);
	});

	test('never-single-line: no-space', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src="path/to">
		`,
			{ rule: 'never-single-line' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('never-single-line: space before and after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src = "path/to">
		`,
			{ rule: 'never-single-line' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' = ',
			},
		]);
	});

	test('never-single-line: space before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src ="path/to">
		`,
			{ rule: 'never-single-line' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('never-single-line: space after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img src= "path/to">
		`,
			{ rule: 'never-single-line' },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '= ',
			},
		]);
	});

	test('never-single-line: line break before', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src
		="path/to">
		`,
			{ rule: 'never-single-line' },
		);
		expect(violations).toStrictEqual([]);
	});

	test('never-single-line: line break after', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<img
		src=
		"path/to">
		`,
			{ rule: 'never-single-line' },
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('fix', () => {
	test('no-space', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
		<img src="path/to">
		`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
		<img src="path/to">
		`,
		);
	});

	test('space before and after', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src = "path/to">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src ="path/to">
			`,
		);
	});

	test('space before', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src ="path/to">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src ="path/to">
			`,
		);
	});

	test('space after', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img src= "path/to">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to">
			`,
		);
	});

	test('line break before', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img
			src
			="path/to">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img
			src
			="path/to">
			`,
		);
	});

	test('line break after', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`
			<img
			src=
			"path/to">
			`,
			{ rule: true },
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img
			src="path/to">
			`,
		);
	});
});
