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
	t.is(r.length, 0);
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
				severity: 'error',
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
				severity: 'error',
				message: '"c-root_x" class name is unmatched pattern of "/^c-[a-z]+__[a-z0-9]+/"',
				line: 3,
				col: 9,
				raw: 'class="c-root_x"',
				ruleId: 'class-naming',
			},
		]
	);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="c-root">
			<div class="c-root__x">
				<div class="c-root__y"></div>
				<main>
					<div class="hoge"></div>
				</main>
			</div>
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
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: '"hoge" class name is unmatched pattern of "/^c-[a-z]+/"',
			line: 6,
			col: 11,
			raw: 'class="hoge"',
			ruleId: 'class-naming',
		},
	]);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="c-root">
			<div class="c-root__x">
				<div class="c-root__y"></div>
				<main>
					<div class="hoge"></div>
				</main>
			</div>
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
					inheritance: true,
				},
				{
					selector: 'main',
					rules: {
						'class-naming': [
							'error',
							'hoge2',
						],
					},
					inheritance: true,
				},
			],
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: '"hoge" class name is unmatched pattern of "hoge2"',
			line: 6,
			col: 11,
			raw: 'class="hoge"',
			ruleId: 'class-naming',
		},
	]);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<div class="c-root">
			<div class="c-root__x">
				<div class="c-root__y"></div>
				<main>
					<div class="hoge"></div>
				</main>
			</div>
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
					inheritance: true,
				},
				{
					selector: 'main',
					rules: {
						'class-naming': [
							'error',
							'/^(?!c-).+$/',
						],
					},
					inheritance: true,
				},
			],
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', (t) => t.pass());
