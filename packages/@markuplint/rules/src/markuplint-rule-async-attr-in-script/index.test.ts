import * as markuplint from 'markuplint';
// import rule from './';

// it('is test', async t => {
// 	const r = await markuplint.verify({
// 		sourceCodes: '<script src="path/to"></script>',
// 		rulese:
// 	}
// 		{
// 			rules: {
// 				'async-attr-in-script': true,
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'warning',
// 			severity: 'warning',
// 			message: 'Required async attribute',
// 			line: 1,
// 			col: 1,
// 			raw: '<script src="path/to">',
// 			ruleId: 'async-attr-in-script',
// 		},
// 	]);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		'<script src="path/to"></script>',
// 		{
// 			rules: {
// 				'async-attr-in-script': ['warning', 'never'],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, []);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		'<script async src="path/to"></script>',
// 		{
// 			rules: {
// 				'async-attr-in-script': ['warning', 'never'],
// 			},
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'warning',
// 			severity: 'warning',
// 			message: 'Not required async attribute',
// 			line: 1,
// 			col: 1,
// 			raw: '<script async src="path/to">',
// 			ruleId: 'async-attr-in-script',
// 		},
// 	]);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 		<script src="jquery"></script>
// 		<script async src="main.js"></script>
// 		<div>lorem</div>
// 		<img src="path/to">
// 		`,
// 		{
// 			rules: {
// 				'async-attr-in-script': 'always',
// 			},
// 			nodeRules: [
// 				{
// 					selector: '[src*="jquery"]',
// 					rules: {
// 						'async-attr-in-script': 'never',
// 					},
// 				},
// 			],
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, []);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 		<script async src="jquery"></script>
// 		<script src="main.js"></script>
// 		<div>lorem</div>
// 		<img src="path/to">
// 		`,
// 		{
// 			rules: {
// 				'async-attr-in-script': ['warning', 'always'],
// 			},
// 			nodeRules: [
// 				{
// 					selector: '[src*="jquery"]',
// 					rules: {
// 						'async-attr-in-script': 'never',
// 					},
// 				},
// 			],
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'warning',
// 			severity: 'warning',
// 			message: 'Not required async attribute',
// 			line: 2,
// 			col: 3,
// 			raw: '<script async src="jquery">',
// 			ruleId: 'async-attr-in-script',
// 		},
// 		{
// 			level: 'warning',
// 			severity: 'warning',
// 			message: 'Required async attribute',
// 			line: 3,
// 			col: 3,
// 			raw: '<script src="main.js">',
// 			ruleId: 'async-attr-in-script',
// 		},
// 	]);
// });
