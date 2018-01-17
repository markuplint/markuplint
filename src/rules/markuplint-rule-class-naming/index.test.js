import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-class-naming';

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="c-root">
			<div class="c-root__el"></div>
			<div class="c-root__el2"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': [
					'error',
					'/^c-[a-z]+/',
				],
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r.length, 0);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="c-root">
			<div class="c-root__el"></div>
			<div class="c-root__el2"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': [
					'error',
					'/^c-[a-z]+/',
				],
			},
			nodeRules: [
				{
					selector: '[class^="c-"]:not([class*="__"])',
					rules: {
						'class-naming': [
							'error',
							'/^c-[a-z]+__[a-z0-9]+/',
						],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(
		r,
		[
			{
				level: 'error',
				message: '"c-root" class name is unmatched pattern of "/^c-[a-z]+__[a-z0-9]+/"',
				line: 2,
				col: 8,
				raw: 'class="c-root"',
				ruleId: 'class-naming',
			},
		]
	);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="c-root">
			<div class="c-root_x"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': [
					'error',
					'/^c-[a-z]+/',
				],
			},
			childNodeRules: [
				{
					selector: '[class^="c-"]:not([class*="__"])',
					rules: {
						'class-naming': [
							'error',
							'/^c-[a-z]+__[a-z0-9]+/',
						],
					},
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(
		r,
		[
			{
				level: 'error',
				message: '"c-root_x" class name is unmatched pattern of "/^c-[a-z]+__[a-z0-9]+/"',
				line: 3,
				col: 9,
				raw: 'class="c-root_x"',
				ruleId: 'class-naming',
			},
		]
	);
});


// test(async (t) => {
// 	const r = await markuplint.verify(
// 		`
// 		<div class="c-root">
// 			<div class="c-root__x">
// 				<div class="c-root__y"></div>
// 				<div class="c-root_z"></div>
// 			</div>
// 		</div>
// 		`,
// 		{
// 			rules: {
// 				'class-naming': [
// 					'error',
// 					'/^c-[a-z]+/',
// 				],
// 			},
// 			childNodeRules: [
// 				{
// 					selector: '[class^="c-"]:not([class*="__"])',
// 					rules: {
// 						'class-naming': [
// 							'error',
// 							'/^c-[a-z]+__[a-z0-9]+/',
// 						],
// 					},
// 					inheritance: true,
// 				},
// 			],
// 		},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(
// 		r,
// 		[
// 			{
// 				level: 'error',
// 				message: '"c-root_z" class name is unmatched pattern of "/^c-[a-z]+__[a-z0-9]+/"',
// 				line: 5,
// 				col: 10,
// 				raw: 'class="c-root_z"',
// 				ruleId: 'class-naming',
// 			},
// 		]
// 	);
// });

test('noop', (t) => t.pass());
