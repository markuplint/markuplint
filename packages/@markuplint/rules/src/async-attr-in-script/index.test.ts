import * as markuplint from 'markuplint';
import rule from './';

test('is test', async () => {
	const r = await markuplint.verify(
		'<script src="path/to"></script>',
		{
			rules: {
				'async-attr-in-script': true,
			},
		},
		[rule],
	);

	expect(r).toStrictEqual([
		{
			severity: 'warning',
			message: 'Required async attribute',
			line: 1,
			col: 1,
			raw: '<script src="path/to">',
			ruleId: 'async-attr-in-script',
		},
	]);
});

test('is test2', async () => {
	const r = await markuplint.verify(
		'<script src="path/to"></script>',
		{
			rules: {
				'async-attr-in-script': {
					severity: 'warning',
					value: 'never',
					option: null,
				},
			},
		},
		[rule],
	);
	expect(r).toStrictEqual([]);
});

test('is test3', async () => {
	const r = await markuplint.verify(
		'<script async src="path/to"></script>',
		{
			rules: {
				'async-attr-in-script': {
					severity: 'warning',
					value: 'never',
					option: null,
				},
			},
		},
		[rule],
	);
	expect(r).toStrictEqual([
		{
			severity: 'warning',
			message: 'Not required async attribute',
			line: 1,
			col: 1,
			raw: '<script async src="path/to">',
			ruleId: 'async-attr-in-script',
		},
	]);
});

test('is test4', async () => {
	const r = await markuplint.verify(
		`
		<script src="jquery"></script>
		<script async src="main.js"></script>
		<div>lorem</div>
		<img src="path/to">
		`,
		{
			rules: {
				'async-attr-in-script': 'always',
			},
			nodeRules: [
				{
					selector: '[src*="jquery"]',
					rules: {
						'async-attr-in-script': 'never',
					},
				},
			],
		},
		[rule],
	);
	expect(r).toStrictEqual([]);
});

test('is test 5', async () => {
	const r = await markuplint.verify(
		`
		<script async src="jquery"></script>
		<script src="main.js"></script>
		<div>lorem</div>
		<img src="path/to">
		`,
		{
			rules: {
				'async-attr-in-script': {
					severity: 'warning',
					value: 'never',
					option: null,
				},
			},
			nodeRules: [
				{
					selector: '[src*="jquery"]',
					rules: {
						'async-attr-in-script': 'never',
					},
				},
			],
		},
		[rule],
	);
	expect(r).toStrictEqual([
		{
			severity: 'warning',
			message: 'Not required async attribute',
			line: 2,
			col: 3,
			raw: '<script async src="jquery">',
			ruleId: 'async-attr-in-script',
		},
		{
			severity: 'warning',
			message: 'Required async attribute',
			line: 3,
			col: 3,
			raw: '<script src="main.js">',
			ruleId: 'async-attr-in-script',
		},
	]);
});
