import rule from './';
import { verify } from '../helpers';

test('pass class name', async () => {
	const r = await verify(
		`
		<div class="c-root">
			<div class="c-root__el"></div>
			<div class="c-root__el2"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': {
					severity: 'error',
					value: '/^c-[a-z]+/',
				},
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('unmatched class name', async () => {
	const r = await verify(
		`
		<div class="c-root">
			<div class="c-root__el"></div>
			<div class="c-root__el2"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': {
					severity: 'error',
					value: '/^c-[a-z]+/',
				},
			},
			nodeRules: [
				{
					selector: '[class^="c-"]:not([class*="__"])',
					rules: {
						'class-naming': {
							severity: 'error',
							value: '/^c-[a-z]+__[a-z0-9]+/',
						},
					},
				},
			],
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '"c-root" class name is unmatched patterns ("/^c-[a-z]+__[a-z0-9]+/")',
			line: 2,
			col: 15,
			raw: 'c-root',
			ruleId: 'class-naming',
		},
	]);
});

test('childNodeRules', async () => {
	const r = await verify(
		`
		<div class="c-root">
			<div class="c-root_x"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': {
					severity: 'error',
					value: '/^c-[a-z]+/',
				},
			},
			childNodeRules: [
				{
					selector: '[class^="c-"]:not([class*="__"])',
					rules: {
						'class-naming': {
							severity: 'error',
							value: '/^c-[a-z]+__[a-z0-9]+/',
						},
					},
				},
			],
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '"c-root_x" class name is unmatched patterns ("/^c-[a-z]+__[a-z0-9]+/")',
			line: 3,
			col: 16,
			raw: 'c-root_x',
			ruleId: 'class-naming',
		},
	]);
});

test('unmatched class name (2)', async () => {
	const r = await verify(
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
				'class-naming': {
					severity: 'error',
					value: '/^c-[a-z]+/',
				},
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '"hoge" class name is unmatched patterns ("/^c-[a-z]+/")',
			line: 6,
			col: 18,
			raw: 'hoge',
			ruleId: 'class-naming',
		},
	]);
});

test('multi pattern', async () => {
	const r = await verify(
		`
		<div class="c-root">
			<div class="c-root__el"></div>
			<div class="exceptional"></div>
		</div>
		`,
		{
			rules: {
				'class-naming': {
					severity: 'error',
					value: ['/^c-[a-z]+/', 'exceptional'],
				},
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('childNodeRules multi selectors', async () => {
	const r = await verify(
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
				'class-naming': {
					severity: 'error',
					value: '/^c-[a-z]+/',
				},
			},
			childNodeRules: [
				{
					selector: '[class^="c-"]:not([class*="__"])',
					rules: {
						'class-naming': {
							severity: 'error',
							value: '/^c-[a-z]+__[a-z0-9]+/',
						},
					},
					inheritance: true,
				},
				{
					selector: 'main',
					rules: {
						'class-naming': {
							severity: 'error',
							value: 'hoge2',
						},
					},
					inheritance: true,
				},
			],
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: '"hoge" class name is unmatched patterns ("hoge2")',
			line: 6,
			col: 18,
			raw: 'hoge',
			ruleId: 'class-naming',
		},
	]);
});

test('childNodeRules multi selectors (No error)', async () => {
	const r = await verify(
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
				'class-naming': {
					severity: 'error',
					value: '/^c-[a-z]+/',
				},
			},
			childNodeRules: [
				{
					selector: '[class^="c-"]:not([class*="__"])',
					rules: {
						'class-naming': {
							severity: 'error',
							value: '/^c-[a-z]+__[a-z0-9]+/',
						},
					},
					inheritance: true,
				},
				{
					selector: 'main',
					rules: {
						'class-naming': {
							severity: 'error',
							value: '/^(?!c-).+$/',
						},
					},
					inheritance: true,
				},
			],
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});
