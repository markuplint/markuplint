import * as markuplint from 'markuplint';
import rule from './';

it('is test', async () => {
	const r = await markuplint.verify({
		sourceCodes: '<script src="path/to"></script>',
		config: {
			rules: {
				'async-attr-in-script': true,
			},
		},
		rules: [rule],
	});

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

it('is test2', async () => {
	const r = await markuplint.verify({
		sourceCodes: '<script src="path/to"></script>',
		config: {
			rules: {
				'async-attr-in-script': ['warning', 'never', null],
			},
		},
		rules: [rule],
	});
	expect(r).toStrictEqual([]);
});

it('is test3', async () => {
	const r = await markuplint.verify({
		sourceCodes: '<script async src="path/to"></script>',
		config: {
			rules: {
				'async-attr-in-script': ['warning', 'never', null],
			},
		},
		rules: [rule],
	});
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

it('is test4', async () => {
	const r = await markuplint.verify({
		sourceCodes: `
		<script src="jquery"></script>
		<script async src="main.js"></script>
		<div>lorem</div>
		<img src="path/to">
		`,
		config: {
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
		rules: [rule],
	});
	expect(r).toStrictEqual([]);
});

it('is test 5', async () => {
	const r = await markuplint.verify({
		sourceCodes: `
		<script async src="jquery"></script>
		<script src="main.js"></script>
		<div>lorem</div>
		<img src="path/to">
		`,
		config: {
			rules: {
				'async-attr-in-script': ['warning', 'always', null],
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
		rules: [rule],
	});
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
