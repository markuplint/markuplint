import { mlTest } from 'markuplint';
import rule from './';

test('pass class name', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(0);
});

test('unmatched class name', async () => {
	const { violations } = await mlTest(
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
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "c-root" class name is unmatched with the below patterns: "/^c-[a-z]+__[a-z0-9]+/"',
			line: 2,
			col: 15,
			raw: 'c-root',
			ruleId: 'class-naming',
		},
	]);
});

test('childNodeRules', async () => {
	const { violations } = await mlTest(
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
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "c-root_x" class name is unmatched with the below patterns: "/^c-[a-z]+__[a-z0-9]+/"',
			line: 3,
			col: 16,
			raw: 'c-root_x',
			ruleId: 'class-naming',
		},
	]);
});

test('unmatched class name (2)', async () => {
	const { violations } = await mlTest(
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
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "hoge" class name is unmatched with the below patterns: "/^c-[a-z]+/"',
			line: 6,
			col: 18,
			raw: 'hoge',
			ruleId: 'class-naming',
		},
	]);
});

test('multi pattern', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(0);
});

test('childNodeRules multi selectors', async () => {
	const { violations } = await mlTest(
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
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "hoge" class name is unmatched with the below patterns: "hoge2"',
			line: 6,
			col: 18,
			raw: 'hoge',
			ruleId: 'class-naming',
		},
	]);
});

test('childNodeRules multi selectors (No error)', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(0);
});

test('Dynamic value', async () => {
	const { violations } = await mlTest(
		'<div className={style}></div>',
		{
			rules: {
				'class-naming': {
					value: '/^c-[a-z]+/',
				},
			},
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('regexSelector', async () => {
	const { violations } = await mlTest(
		`<section class="Card">
	<div class="Card__header">
		<div class="Heading"><h3 class="Heading__lv3">Title</h3></div>
	</div>
	<div class="Card__body">
		<div class="List">
			<ul class="List__group">
				<li>...</li>
				<li>...</li>
				<li>...</li>
			</ul>
		</div>
	</div>
</section>

<section class="Card">
	<div class="Card__header">
		<!-- 👎 It is "Card" scope, Don't use the element owned "Heading" -->
		<h3 class="Heading__lv3">Title</h3>
	</div>
	<div class="Card__body">
		<div class="Card__body-el">...</div>
		<!-- 👎 It is "Card" scope, Don't use the element owned "List" -->
		<ul class="List__group">
			<li>...</li>
			<li>...</li>
			<li>...</li>
		</ul>
		<div class="List">
			<!-- 👎 It is not "Card" scope instead of "List" scope here -->
			<ul class="Card__list">
				<li>...</li>
				<li>...</li>
				<li>...</li>
			</ul>
		</div>
	</div>
</section>
`,
		{
			rules: {
				'class-naming': '/.+/',
			},
			childNodeRules: [
				{
					regexSelector: {
						attrName: 'class',
						attrValue: '/^(?<BlockName>[A-Z][a-z0-9]+)(?:__[a-z][a-z0-9-]+)?$/',
					},
					rules: {
						'class-naming': {
							value: ['/^{{BlockName}}__[a-z][a-z0-9-]+$/', '/^([A-Z][a-z0-9]+)$/'],
							reason: 'Do not allow include the element in a no-own block.',
						},
					},
				},
			],
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			ruleId: 'class-naming',
			severity: 'warning',
			line: 19,
			col: 14,
			raw: 'Heading__lv3',
			message:
				'The "Heading__lv3" class name is unmatched with the below patterns: "/^Card__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"',
			reason: 'Do not allow include the element in a no-own block.',
		},
		{
			ruleId: 'class-naming',
			severity: 'warning',
			line: 24,
			col: 14,
			raw: 'List__group',
			message:
				'The "List__group" class name is unmatched with the below patterns: "/^Card__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"',
			reason: 'Do not allow include the element in a no-own block.',
		},
		{
			ruleId: 'class-naming',
			severity: 'warning',
			line: 31,
			col: 15,
			raw: 'Card__list',
			message:
				'The "Card__list" class name is unmatched with the below patterns: "/^List__[a-z][a-z0-9-]+$/", "/^([A-Z][a-z0-9]+)$/"',
			reason: 'Do not allow include the element in a no-own block.',
		},
	]);
});
