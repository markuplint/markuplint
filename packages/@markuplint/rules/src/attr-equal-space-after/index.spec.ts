import { mlTest } from 'markuplint';

import rule from './';

describe('verify', () => {
	test('no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('space before and after', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' = ',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('space before', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('space after', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '= ',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('line break before', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('line break after', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '=\n\t\t',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always: no-space', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '=',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always: space before and after', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('always: space before', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' =',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always: space after', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('always: line break before', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '\n\t\t=',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always: line break after', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('always-single-line: no-space', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '=',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always-single-line: space before and after', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('always-single-line: space before', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' =',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always-single-line: space after', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('always-single-line: line break before', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '\n\t\t=',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('always: line break after', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Always insert space after equal sign of attribute',
				line: 3,
				col: 6,
				raw: '=\n\t\t',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('never-single-line: no-space', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('never-single-line: space before and after', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: ' = ',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('never-single-line: space before', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('never-single-line: space after', async () => {
		const { violations } = await mlTest(
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
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Never insert space after equal sign of attribute',
				line: 2,
				col: 11,
				raw: '= ',
				ruleId: 'attr-equal-space-after',
			},
		]);
	});

	test('never-single-line: line break before', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});

	test('never-single-line: line break after', async () => {
		const { violations } = await mlTest(
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
		expect(violations).toStrictEqual([]);
	});
});

describe('fix', () => {
	test('no-space', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
		<img src="path/to">
		`,
		);
	});

	test('space before and after', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src ="path/to">
			`,
		);
	});

	test('space before', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src ="path/to">
			`,
		);
	});

	test('space after', async () => {
		const { fixedCode } = await mlTest(
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
			true,
		);
		expect(fixedCode).toEqual(
			`
			<img src="path/to">
			`,
		);
	});

	test('line break before', async () => {
		const { fixedCode } = await mlTest(
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
		const { fixedCode } = await mlTest(
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
