import { mlTest } from 'markuplint';
import rule from './';

const ruleOn = {
	rules: {
		'permitted-contents': true,
	},
};

describe('verify', () => {
	test('a', async () => {
		const { violations: violations1 } = await mlTest(
			'<a><div></div><span></span><em></em></a>',
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlTest('<a><h1></h1></a>', ruleOn, [rule], 'en');
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlTest('<div><a><option></option></a><div>', ruleOn, [rule], 'en');
		expect(violations3).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);

		const { violations: violations4 } = await mlTest('<a><button></button></a>', ruleOn, [rule], 'en');
		expect(violations4).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);

		const { violations: violations5 } = await mlTest(
			'<a><div><div><button></button></div></div></a>',
			ruleOn,
			[rule],
			'en',
		);
		expect(violations5).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);

		const { violations: violations6 } = await mlTest('<span><a><div></div></a></span>', ruleOn, [rule], 'en');
		expect(violations6).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);
	});

	test('address', async () => {
		const { violations: violations1 } = await mlTest(
			'<address><address></address></address>',
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<address>',
				message: 'Invalid content of the address element in the HTML specification',
			},
		]);
	});

	test('audio', async () => {
		const { violations: violations1 } = await mlTest(
			'<div><audio src="path/to"><source></audio></div>',
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<audio src="path/to">',
				message: 'Invalid content of the audio element in the HTML specification',
			},
		]);

		const { violations: violations2 } = await mlTest(
			'<div><audio><source><div></div></audio></div>',
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlTest('<div><audio><source></audio></div>', ruleOn, [rule], 'en');
		expect(violations3).toStrictEqual([]);
	});

	test('dl', async () => {
		const { violations: violations1 } = await mlTest(
			`<dl>
				<dt></dt>
				<dd></dd>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlTest(
			`<dl>
				<dt></dt>
				<dd></dd>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<dl>',
				message: 'Invalid content of the dl element in the HTML specification',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 4,
				col: 5,
				raw: '<div>',
				message: 'Invalid content of the div element in the HTML specification',
			},
		]);

		const { violations: violations3 } = await mlTest(
			`<dl>
				<dt></dt>
				<div></div>
				<dd></dd>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations3).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<dl>',
				message: 'Invalid content of the dl element in the HTML specification',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 3,
				col: 5,
				raw: '<div>',
				message: 'Invalid content of the div element in the HTML specification',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 5,
				col: 5,
				raw: '<div>',
				message: 'Invalid content of the div element in the HTML specification',
			},
		]);

		const { violations: violations4 } = await mlTest(
			`<dl>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations4.length).toStrictEqual(4);

		const { violations: violations5 } = await mlTest(
			`<dl>
				<div>
					<dt></dt>
					<dd></dd>
				</div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations5).toStrictEqual([]);

		const { violations: violations6 } = await mlTest(
			`<div>
				<dt></dt>
				<dd></dd>
			</div>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations6).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<div>',
				message: 'Invalid content of the div element in the HTML specification',
			},
		]);

		const { violations: violations7 } = await mlTest(
			`<dl>
				<div>
					<span></span>
				</div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations7).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 2,
				col: 5,
				raw: '<div>',
				message: 'Invalid content of the div element in the HTML specification',
			},
		]);
	});

	test('table', async () => {
		const { violations: violations1 } = await mlTest(
			`<table>
			<thead></thead>
			<tr>
				<td>cell</td>
			</tr>
		</table>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlTest(
			`<table>
			<tbody>
				<tr>
					<td>cell</td>
				</tr>
			</tbody>
			<thead></thead>
		</table>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content of the table element in the HTML specification',
			},
		]);
	});

	test('ruby', async () => {
		const { violations: violations1 } = await mlTest(
			`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
			<rp>)</rp>
		</ruby>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlTest(
			`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
		</ruby>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<ruby>',
				message: 'Invalid content of the ruby element in the HTML specification',
			},
		]);

		const { violations: violations3 } = await mlTest(
			`<ruby>
				♥ <rt> Heart <rt lang=fr> Cœur </rt>
				☘ <rt> Shamrock <rt lang=fr> Trèfle </rt>
				✶ <rt> Star <rt lang=fr> Étoile </rt>
			</ruby>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations3).toStrictEqual([]);
	});

	test('ul', async () => {
		const { violations: violations1 } = await mlTest('<ul><div></div></ul>', ruleOn, [rule], 'en');
		expect(violations1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<ul>',
				message: 'Invalid content of the ul element in the HTML specification',
			},
		]);

		const { violations: violations2 } = await mlTest('<ul><li></li></ul>', ruleOn, [rule], 'en');
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlTest('<ul><li></li><li></li><li></li></ul>', ruleOn, [rule], 'en');
		expect(violations3).toStrictEqual([]);
	});

	test('area', async () => {
		const { violations: violations1 } = await mlTest('<div><area></div>', ruleOn, [rule], 'en');
		expect(violations1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<area>',
				message: 'The area element must be descendant of the map element',
			},
		]);

		const { violations: violations2 } = await mlTest('<map><area></map>', ruleOn, [rule], 'en');
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlTest('<map><div><area></div></map>', ruleOn, [rule], 'en');
		expect(violations3).toStrictEqual([]);
	});

	test('meta', async () => {
		const { violations: violations1 } = await mlTest(
			`<ol>
				<li>
					<span>Award winners</span>
					<meta content="3" />
				</li>
			</ol>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 2,
				col: 5,
				raw: '<li>',
				message: 'Invalid content of the li element in the HTML specification',
			},
		]);

		const { violations: violations2 } = await mlTest(
			`<ol itemscope itemtype="https://schema.org/BreadcrumbList">
				<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
					<a itemprop="item" href="https://example.com/books">
						<span itemprop="name">Books</span>
					</a>
					<meta itemprop="position" content="1" />
				</li>
				<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
					<a itemscope itemtype="https://schema.org/WebPage" itemprop="item" itemid="https://example.com/books/sciencefiction" href="https://example.com/books/sciencefiction">
						<span itemprop="name">Science Fiction</span>
					</a>
					<meta itemprop="position" content="2" />
				</li>
				<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
					<span itemprop="name">Award winners</span>
					<meta itemprop="position" content="3" />
				</li>
			</ol>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([]);
	});

	test('hgroup', async () => {
		const { violations: violations1 } = await mlTest(
			`<hgroup>
				<h1>Heading</h1>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlTest(
			`<hgroup>
				<h1>Heading</h1>
				<h2>Sub</h2>
				<h2>Sub2</h2>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlTest(
			`<hgroup>
				<template></template>
				<h1>Heading</h1>
				<template></template>
				<h2>Sub</h2>
				<template></template>
				<h2>Sub2</h2>
				<template></template>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations3).toStrictEqual([]);

		const { violations: violations4 } = await mlTest(
			`<hgroup>
				<template></template>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations4).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<hgroup>',
				message: 'Invalid content of the hgroup element in the HTML specification',
			},
		]);
	});

	test('script', async () => {
		const { violations: violations1 } = await mlTest(
			`<script>
				alert("checking");
			</script>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);
	});

	test('style', async () => {
		const { violations: violations1 } = await mlTest(
			`<style>
				#id {
					prop: value;
				}
			</style>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);
	});

	test('template', async () => {
		const { violations: violations1 } = await mlTest(
			`<div>
				<a href="path/to">
					<template>
						<span>tmpl</span>
					</template>
				</a>
			</div>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlTest(
			`<div>
				<a href="path/to">
					<template>
						<button>tmpl</button>
					</template>
				</a>
			</div>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(violations2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 2,
				col: 5,
				raw: '<a href="path/to">',
				message: 'Invalid content of the a element in the HTML specification',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 3,
				col: 6,
				raw: '<template>',
				message: 'Invalid content of the template element in the HTML specification',
			},
		]);
	});

	test('Dep exp named capture in interleave', async () => {
		const { violations: violations1 } = await mlTest('<figure><img><figcaption></figure>', ruleOn, [rule], 'en');
		expect(violations1).toStrictEqual([]);
	});

	test('Custom element', async () => {
		const { violations: violations1 } = await mlTest('<div><x-item></x-item></div>', ruleOn, [rule], 'en');
		expect(violations1).toStrictEqual([]);
	});

	test('Custom element', async () => {
		const o = {
			rules: {
				'permitted-contents': [
					{
						tag: 'x-container',
						contents: [
							{
								require: 'x-item',
								min: 2,
								max: 5,
							},
						],
					},
				],
			},
		};

		const { violations: violations1 } = await mlTest('<x-container></x-container>', o, [rule], 'en');
		const { violations: violations2 } = await mlTest(
			'<x-container><x-item>0</x-item></x-container>',
			o,
			[rule],
			'en',
		);
		const { violations: violations3 } = await mlTest(
			'<x-container><x-item>0</x-item><x-item>1</x-item><x-item>2</x-item></x-container>',
			o,
			[rule],
			'en',
		);
		const { violations: violations4 } = await mlTest(
			`<x-container>
					<x-item>0</x-item>
					<x-item>1</x-item>
					<x-item>2</x-item>
					<x-item>3</x-item>
					<x-item>4</x-item>
				</x-container>`,
			o,
			[rule],
			'en',
		);
		const { violations: violations5 } = await mlTest(
			`<x-container>
					<x-item>0</x-item>
					<x-item>1</x-item>
					<x-item>2</x-item>
					<x-item>3</x-item>
					<x-item>4</x-item>
					<x-item>5</x-item>
					<x-item>6</x-item>
				</x-container>`,
			o,
			[rule],
			'en',
		);
		expect(violations1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content of the x-container element in settings',
			},
		]);
		expect(violations2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content of the x-container element in settings',
			},
		]);
		expect(violations3).toStrictEqual([]);
		expect(violations4).toStrictEqual([]);
		expect(violations5).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content of the x-container element in settings',
			},
		]);
	});
});

describe('React', () => {
	const jsxRuleOn = {
		...ruleOn,
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('case-sensitive', async () => {
		expect((await mlTest('<A><button></button></A>', ruleOn, [rule], 'en')).violations).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Invalid content of the A element in the HTML specification',
				raw: '<A>',
			},
		]);

		expect((await mlTest('<a><button></button></a>', jsxRuleOn, [rule], 'en')).violations).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Invalid content of the a element in the HTML specification',
				raw: '<a>',
			},
		]);

		expect((await mlTest('<A><button></button></A>', jsxRuleOn, [rule], 'en')).violations).toStrictEqual([]);
	});

	test('Components', async () => {
		expect(
			(
				await mlTest(
					'<Html><Head /><body><p><Link href="path/to">SPA Link</Link></p></body></Html>',
					jsxRuleOn,
					[rule],
					'en',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('Expect to contain a text node', async () => {
		expect((await mlTest('<head><title>{variable}</title></head>', ruleOn, [rule], 'en')).violations).toStrictEqual(
			[],
		);
		expect((await mlTest('<head><title>\n</title></head>', ruleOn, [rule], 'en')).violations).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Invalid content of the title element in the HTML specification',
				raw: '<title>',
			},
		]);
		expect((await mlTest('<head><title>\n</title></head>', jsxRuleOn, [rule], 'en')).violations).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Invalid content of the title element in the HTML specification',
				raw: '<title>',
			},
		]);
		expect(
			(await mlTest('<head><title>_variable_</title></head>', jsxRuleOn, [rule], 'en')).violations,
		).toStrictEqual([]);
		expect(
			(await mlTest('<head><title>{variable}</title></head>', jsxRuleOn, [rule], 'en')).violations,
		).toStrictEqual([]);
	});
});

describe('EJS', () => {
	const ejsRuleOn = {
		...ruleOn,
		parser: {
			'.*': '@markuplint/ejs-parser',
		},
	};

	test('PSBlock', async () => {
		expect(
			(
				await mlTest(
					`<!DOCTYPE html>
<html lang="en">
	<head>
		<%- include('path/to') _%>
	</head>
	<body>
		<ul><%- include('path/to') _%></ul>
		<ul><li>item</li></ul>
		<ul><span>item</span></ul>
	</body>
</html>
`,
					ejsRuleOn,
					[rule],
					'en',
				)
			).violations,
		).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 9,
				col: 3,
				message: 'Invalid content of the ul element in the HTML specification',
				raw: '<ul>',
			},
		]);
	});

	test('PSBlock', async () => {
		expect((await mlTest('<title><%- "title" _%></title>', ejsRuleOn, [rule], 'en')).violations).toStrictEqual([]);
	});
});
