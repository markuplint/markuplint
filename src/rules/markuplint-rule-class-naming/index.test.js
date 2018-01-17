import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-class-naming';

const rule = new CustomRule();

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
					selector: '[class^="c-"]:not([class=*="__"])',
					rules: [
						{
							'class-naming': [
								'error',
								'/^c-[a-z]+__[a-z0-9]+/',
							],
						},
					],
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r.length, 0);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="root">
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
					selector: '[class^="c-"]:not([class=*="__"])',
					rules: [
						{
							'class-naming': [
								'error',
								'/^c-[a-z]+__[a-z0-9]+/',
							],
						},
					],
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
				message: '"root" class name is unmatched pattern of "/^c-[a-z]+/"',
				line: 2,
				col: 8,
				raw: 'class="root"',
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
			nodeRules: [
				{
					selector: '[class^="c-"]:not([class=*="__"])',
					rules: [
						{
							'class-naming': [
								'error',
								'/^c-[a-z]+__[a-z0-9]+/',
							],
						},
					],
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
				message: '"root" class name is unmatched pattern of "/^c-[a-z]+/"',
				line: 2,
				col: 8,
				raw: 'class="root"',
				ruleId: 'class-naming',
			},
		]
	);
});

test('noop', (t) => t.pass());
