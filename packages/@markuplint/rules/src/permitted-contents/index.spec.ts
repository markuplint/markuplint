import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('a', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<a><div></div><span></span><em></em></a>');
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(rule, '<a><h1></h1></a>');
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlRuleTest(rule, '<div><a><option></option></a></div>');
		expect(violations3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: '<option>',
				message:
					'The "option" element is not allowed in the "div" element through the transparent model in this context',
			},
		]);

		const { violations: violations4 } = await mlRuleTest(rule, '<a><button></button></a>');
		expect(violations4).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				raw: '<button>',
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
			},
		]);

		const { violations: violations5 } = await mlRuleTest(rule, '<a><div><div><button></button></div></div></a>');
		expect(violations5).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 14,
				raw: '<button>',
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
			},
		]);

		const { violations: violations6 } = await mlRuleTest(rule, '<span><a><div></div></a></span>');
		expect(violations6).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				raw: '<div>',
				message:
					'The "div" element is not allowed in the "span" element through the transparent model in this context',
			},
		]);

		const { violations: violations7 } = await mlRuleTest(rule, '<a>text</a>');
		expect(violations7).toStrictEqual([]);

		const { violations: violations8 } = await mlRuleTest(
			rule,
			'<div><a><div><div><button></button></div></div></a></div>',
		);
		expect(violations8).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 19,
				raw: '<button>',
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
			},
		]);
	});

	test('address', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<address><address></address></address>');
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "address" element is not allowed in the "address" element in this context',
				raw: '<address>',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			'<address><div><div><div><address></address></div></div></div></address>',
		);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'The "address" element is not allowed in the "address" element in this context',
				raw: '<address>',
			},
		]);
	});

	test('audio', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<div><audio src="path/to"><source></audio></div>');
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				message:
					'The "source" element is not allowed in the "div" element through the transparent model in this context',
				raw: '<source>',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(rule, '<div><audio><source><div></div></audio></div>');
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlRuleTest(rule, '<div><audio><source></audio></div>');
		expect(violations3).toStrictEqual([]);

		const { violations: violations4 } = await mlRuleTest(rule, '<audio><audio></audio></audio>');
		expect(violations4).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 8,
				message:
					'The "audio" element is a transparent model but also disallows the "audio" element in this context',
				raw: '<audio>',
			},
		]);

		const { violations: violations5 } = await mlRuleTest(rule, '<div><audio><audio></audio></audio></div>');
		expect(violations5).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 13,
				message:
					'The "audio" element is a transparent model but also disallows the "audio" element in this context',
				raw: '<audio>',
			},
		]);
	});

	test('dl', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<dl>
				<dt></dt>
				<dd></dd>
			</dl>`,
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			`<dl>
				<dt></dt>
				<dd></dd>
				<div></div>
			</dl>`,
		);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				col: 5,
				line: 2,
				message: 'The "dt" element is not allowed in the "dl" element in this context',
				raw: '<dt>',
			},
			{
				severity: 'error',
				line: 4,
				col: 5,
				message: 'Require one or more elements. (Need "dt")',
				raw: '<div>',
			},
		]);

		const { violations: violations3 } = await mlRuleTest(
			rule,
			`<dl>
				<dt></dt>
				<div></div>
				<dd></dd>
				<div></div>
			</dl>`,
		);
		expect(violations3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl>',
			},
			{
				severity: 'error',
				line: 3,
				col: 5,
				message: 'Require one or more elements. (Need "dt")',
				raw: '<div>',
			},
			{
				severity: 'error',
				line: 5,
				col: 5,
				message: 'Require one or more elements. (Need "dt")',
				raw: '<div>',
			},
		]);

		const { violations: violations4 } = await mlRuleTest(
			rule,
			`<dl>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</dl>`,
		);
		expect(violations4.length).toStrictEqual(4);

		const { violations: violations5 } = await mlRuleTest(
			rule,
			`<dl>
				<div>
					<dt></dt>
					<dd></dd>
				</div>
			</dl>`,
		);
		expect(violations5).toStrictEqual([]);

		const { violations: violations6 } = await mlRuleTest(
			rule,
			`<div>
				<dt></dt>
				<dd></dd>
			</div>`,
		);
		expect(violations6).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 5,
				message: 'The "dt" element is not allowed in the "div" element in this context',
				raw: '<dt>',
			},
		]);

		const { violations: violations7 } = await mlRuleTest(
			rule,
			`<dl>
				<div>
					<span></span>
				</div>
			</dl>`,
		);
		expect(violations7).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 5,
				message: 'Require one or more elements. (Need "dt")',
				raw: '<div>',
			},
		]);
	});

	test('table', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<table>
			<thead></thead>
			<tr>
				<td>cell</td>
			</tr>
		</table>`,
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			`<table>
			<tbody>
				<tr>
					<td>cell</td>
				</tr>
			</tbody>
			<thead></thead>
		</table>`,
		);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 7,
				col: 4,
				message: 'The "thead" element is not allowed in the "table" element in this context',
				raw: '<thead>',
			},
		]);
	});

	test('ruby', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
			<rp>)</rp>
		</ruby>`,
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
		</ruby>`,
		);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require an element. (Need "rp")',
				raw: '<ruby>',
			},
		]);

		const { violations: violations3 } = await mlRuleTest(
			rule,
			// cspell: disable
			`<ruby>
				♥ <rt> Heart <rt lang=fr> Cœur </rt>
				☘ <rt> Shamrock <rt lang=fr> Trèfle </rt>
				✶ <rt> Star <rt lang=fr> Étoile </rt>
			</ruby>`,
			// cspell: enable
		);
		expect(violations3).toStrictEqual([]);
	});

	test('ul', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<ul><div></div></ul>');
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The "div" element is not allowed in the "ul" element in this context',
				raw: '<div>',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(rule, '<ul>TEXT</ul>');
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The text node is not allowed in the "ul" element in this context',
				raw: 'TEXT',
			},
		]);

		const { violations: violations3 } = await mlRuleTest(rule, '<ul><li></li></ul>');
		expect(violations3).toStrictEqual([]);

		const { violations: violations4 } = await mlRuleTest(rule, '<ul><li></li><li></li><li></li></ul>');
		expect(violations4).toStrictEqual([]);
	});

	// test('area', async () => {
	// 	const { violations: violations1 } = await mlRuleTest(rule, '<div><area></div>');
	// 	expect(violations1).toStrictEqual([
	// 		{
	// 			severity: 'error',
	// 			line: 1,
	// 			col: 6,
	// 			raw: '<area>',
	// 			message: 'The "area" element must be descendant of the "map" element',
	// 		},
	// 	]);

	// 	const { violations: violations2 } = await mlRuleTest(rule, '<map><area></map>');
	// 	expect(violations2).toStrictEqual([]);

	// 	const { violations: violations3 } = await mlRuleTest(rule, '<map><div><area></div></map>');
	// 	expect(violations3).toStrictEqual([]);
	// });

	test('meta', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<ol>
				<li>
					<span>Award winners</span>
					<meta content="3" />
				</li>
			</ol>`,
		);
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 6,
				message: 'The "meta" element is not allowed in the "li" element in this context',
				raw: '<meta content="3" />',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
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
		);
		expect(violations2).toStrictEqual([]);
	});

	test('hgroup', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<hgroup>
				<h1>Heading</h1>
			</hgroup>`,
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			`<hgroup>
				<h1>Heading</h1>
				<h2>Sub</h2>
				<h2>Sub2</h2>
			</hgroup>`,
		);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 5,
				message: 'The "h2" element is not allowed in the "hgroup" element in this context',
				raw: '<h2>',
			},
		]);

		const { violations: violations3 } = await mlRuleTest(
			rule,
			`<hgroup>
				<template></template>
				<h1>Heading</h1>
				<template></template>
				<h2>Sub</h2>
				<template></template>
				<h2>Sub2</h2>
				<template></template>
			</hgroup>`,
		);
		expect(violations3).toStrictEqual([
			{
				severity: 'error',
				line: 5,
				col: 5,
				message: 'The "h2" element is not allowed in the "hgroup" element in this context',
				raw: '<h2>',
			},
		]);

		const { violations: violations4 } = await mlRuleTest(
			rule,
			`<hgroup>
				<template></template>
			</hgroup>`,
		);
		expect(violations4).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<hgroup>',
				message: 'Require an element. (Need "h6")',
			},
		]);
	});

	test('select', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<select>
			</select>`,
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			`<select>
				<option>1</option>
			</select>`,
		);
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlRuleTest(
			rule,
			`<select>
				<option>1</option>
				<option>2</option>
				<option>3</option>
			</select>`,
		);
		expect(violations3).toStrictEqual([]);

		const { violations: violations4 } = await mlRuleTest(
			rule,
			`<select>
				<optgroup>
				</optgroup>
			</select>`,
		);
		expect(violations4).toStrictEqual([]);

		const { violations: violations5 } = await mlRuleTest(
			rule,
			`<select>
				<optgroup>
					<option>1</option>
				</optgroup>
			</select>`,
		);
		expect(violations5).toStrictEqual([]);

		const { violations: violations6 } = await mlRuleTest(
			rule,
			`<select>
				<optgroup>
					<option>1</option>
					<option>2</option>
					<option>3</option>
				</optgroup>
			</select>`,
		);
		expect(violations6).toStrictEqual([]);

		const { violations: violations7 } = await mlRuleTest(
			rule,
			`<select>
				<div><!-- Parse Error --></div>
			</select>`,
		);
		expect(violations7).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The text node is not allowed in the "select" element in this context',
				raw: '\n\t\t\t\t<div>',
			},
		]);

		const { violations: violations8 } = await mlRuleTest(
			rule,
			`<select>
				<optgroup>
					<div><!-- Parse Error --></div>
				</optgroup>
			</select>`,
		);
		expect(violations8).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 15,
				message: 'The text node is not allowed in the "optgroup" element in this context',
				raw: '\n\t\t\t\t\t<div>',
			},
		]);
	});

	test('script', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<script>
				alert("checking");
			</script>`,
		);
		expect(violations1).toStrictEqual([]);
	});

	test('style', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<style>
				#id {
					prop: value;
				}
			</style>`,
		);
		expect(violations1).toStrictEqual([]);
	});

	test('Multiple', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<body>
	<a href="001.html">
		<div>
			<button></button>
		</div>
	</a>
	<audio src="path/to">
		<source src="path/to" />
	</audio>
</body>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 9,
				col: 3,
				message:
					'The "source" element is not allowed in the "body" element through the transparent model in this context',
				raw: '<source src="path/to" />',
			},
			{
				severity: 'error',
				line: 5,
				col: 4,
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
				raw: '<button>',
			},
		]);
	});

	test('Dep exp named capture in interleave', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<figure><img><figcaption></figure>');
		expect(violations1).toStrictEqual([]);
	});

	test('Custom element', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<div><x-item></x-item></div>');
		expect(violations1).toStrictEqual([]);
	});

	test('svg:a', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<svg><a><text>text</text></a></svg>');
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(rule, '<svg><a><feBlend /></a></svg>');
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message:
					'The "feBlend" element is not allowed in the "svg" element through the transparent model in this context',
				raw: '<feBlend />',
			},
		]);
	});

	test('svg:foreignObject', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			'<svg><foreignObject><div>text</div></foreignObject></svg>',
		);
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(
			rule,
			'<svg><foreignObject><rect /></foreignObject></svg>',
		);
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlRuleTest(
			rule,
			'<svg><foreignObject><div><rect /></div></foreignObject></svg>',
		);
		expect(violations3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "rect" element is not allowed in the "div" element in this context',
				raw: '<rect />',
			},
		]);
	});

	test('Interactive Element in SVG', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<svg><video></video></svg>');
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "video" element is not allowed in the "svg" element in this context',
				raw: '<video>',
			},
		]);
	});

	test('The SVG <image> element and the HTML obsolete <image> element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>',
		);
		const { violations: violations2 } = await mlRuleTest(
			rule,
			'<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>',
		);
		expect(violations).toStrictEqual([]);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'The "image" element is not allowed in the "span" element in this context',
				raw: '<image width="100" height="100" xlink:href="path/to"/>',
			},
		]);
	});

	test('Custom element', async () => {
		const o = {
			rule: [
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
		};

		const { violations: violations1 } = await mlRuleTest(rule, '<x-container></x-container>', o);
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Require an element. (Need "x-item")',
			},
		]);

		const { violations: violations2 } = await mlRuleTest(rule, '<x-container><x-item>0</x-item></x-container>', o);
		expect(violations2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Require an element. (Need "x-item")',
			},
		]);

		const { violations: violations3 } = await mlRuleTest(
			rule,
			'<x-container><x-item>0</x-item><x-item>1</x-item><x-item>2</x-item></x-container>',
			o,
		);
		expect(violations3).toStrictEqual([]);

		const { violations: violations4 } = await mlRuleTest(
			rule,
			`<x-container>
					<x-item>0</x-item>
					<x-item>1</x-item>
					<x-item>2</x-item>
					<x-item>3</x-item>
					<x-item>4</x-item>
				</x-container>`,
			o,
		);
		expect(violations4).toStrictEqual([]);

		const { violations: violations5 } = await mlRuleTest(
			rule,
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
		);
		expect(violations5).toStrictEqual([
			{
				severity: 'error',
				line: 7,
				col: 6,
				message: 'There is more content than it needs. the max number of elements required is 5',
				raw: '<x-item>',
			},
		]);
	});

	test('special content models', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<script>
						<style></style>
						<div></div>
						<li></li>
						<script></script>
					</script>`,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<style>
						<style></style>
						<div></div>
						<li></li>
						<style></style>
					</style>`,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<noscript>
						<style></style>
						<div></div>
						<li></li>
						<noscript></noscript>
					</noscript>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 5,
				col: 7,
				message:
					'The "noscript" element is a transparent model but also disallows the "noscript" element in this context',
				raw: '<noscript>',
			},
		]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<iframe>
						<style></style>
						<div></div>
						<li></li>
						<iframe></iframe>
					</iframe>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The element disallows contents',
				raw: '<iframe>',
			},
		]);
	});
});

describe('React', () => {
	const jsxRuleOn = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('case-sensitive', async () => {
		expect((await mlRuleTest(rule, '<A><button></button></A>')).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
				raw: '<button>',
			},
		]);

		expect((await mlRuleTest(rule, '<a><button></button></a>', jsxRuleOn)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
				raw: '<button>',
			},
		]);

		expect((await mlRuleTest(rule, '<A><button></button></A>', jsxRuleOn)).violations).toStrictEqual([]);
	});

	test('Components', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<Html><Head /><body><p><Link href="path/to">SPA Link</Link></p></body></Html>',
					jsxRuleOn,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('Expect to contain a text node', async () => {
		expect((await mlRuleTest(rule, '<head><title>{variable}</title></head>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<head><title>\n</title></head>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<head><title>\n</title></head>', jsxRuleOn)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<head><title>_variable_</title></head>', jsxRuleOn)).violations).toStrictEqual(
			[],
		);
		expect((await mlRuleTest(rule, '<head><title>{variable}</title></head>', jsxRuleOn)).violations).toStrictEqual(
			[],
		);
	});

	test('Element has only custom components', async () => {
		expect((await mlRuleTest(rule, '<div><Component/></div>', jsxRuleOn)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<ul><Component/></ul>', jsxRuleOn)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The "Component" element is not allowed in the "ul" element in this context',
				raw: '<Component/>',
			},
		]);
		expect((await mlRuleTest(rule, '<svg><Component/></svg>', jsxRuleOn)).violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "Component" element is not allowed in the "svg" element in this context',
				raw: '<Component/>',
			},
		]);
	});
});

describe('Pretenders Option', () => {
	const jsxRuleOn = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('Element', async () => {
		expect(
			(
				await mlRuleTest(rule, '<ul><MyComponent/></ul>', {
					...jsxRuleOn,
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'li',
						},
					],
				})
			).violations.length,
		).toBe(0);
		expect(
			(
				await mlRuleTest(rule, '<ul><MyComponent/></ul>', {
					...jsxRuleOn,
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The "div" element is not allowed in the "ul" element in this context',
				raw: '<MyComponent/>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<svg><MyComponent/></svg>', {
					...jsxRuleOn,
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'rect',
								namespace: 'svg',
							},
						},
					],
				})
			).violations.length,
		).toBe(0);
		expect(
			(
				await mlRuleTest(rule, '<span><MyComponent><div></div></MyComponent></span>', {
					...jsxRuleOn,
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'a',
							},
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				raw: '<div>',
				message:
					'The "div" element is not allowed in the "span" element through the transparent model in this context',
			},
		]);
	});

	test('Attr', async () => {
		expect(
			(
				await mlRuleTest(rule, '<a href><MyComponent/></a>', {
					...jsxRuleOn,
					pretenders: [
						{
							selector: 'MyComponent',
							as: {
								element: 'div',
								attrs: [
									{
										name: 'tabindex',
									},
								],
							},
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "a" element is a transparent model but also disallows the "div" element in this context',
				raw: '<MyComponent/>',
			},
		]);
	});

	test('The `as` attribute', async () => {
		expect(
			(
				await mlRuleTest(rule, '<ul><MyComponent as="li"/></ul>', {
					...jsxRuleOn,
				})
			).violations.length,
		).toBe(0);
		expect(
			(
				await mlRuleTest(rule, '<ul><MyComponent as="div"/></ul>', {
					...jsxRuleOn,
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The "div" element is not allowed in the "ul" element in this context',
				raw: '<MyComponent as="div"/>',
			},
		]);
		expect(
			(
				await mlRuleTest(rule, '<svg><MyComponent as="rect"/></svg>', {
					...jsxRuleOn,
				})
			).violations.length,
		).toBe(0);
		expect(
			(
				await mlRuleTest(rule, '<span><MyComponent as="a"><div></div></MyComponent></span>', {
					...jsxRuleOn,
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				raw: '<div>',
				message:
					'The "div" element is not allowed in the "span" element through the transparent model in this context',
			},
		]);
	});
});

describe('Vue', () => {
	const vueRuleOn = {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
	};

	test('Element has only custom components', async () => {
		expect(
			(await mlRuleTest(rule, '<template><div><x-component/></div></template>', vueRuleOn)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<template><ul><x-component/></ul></template>', vueRuleOn)).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message: 'The "x-component" element is not allowed in the "ul" element in this context',
				raw: '<x-component/>',
			},
		]);
		expect(
			(await mlRuleTest(rule, '<template><svg><x-component/></svg></template>', vueRuleOn)).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 16,
				message: 'The "x-component" element is not allowed in the "svg" element in this context',
				raw: '<x-component/>',
			},
		]);
	});
});

describe('EJS', () => {
	const ejsRuleOn = {
		parser: {
			'.*': '@markuplint/ejs-parser',
		},
	};

	test('PSBlock', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
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
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 9,
				col: 7,
				message: 'The "span" element is not allowed in the "ul" element in this context',
				raw: '<span>',
			},
		]);
	});

	test('PSBlock', async () => {
		expect((await mlRuleTest(rule, '<title><%- "title" _%></title>', ejsRuleOn)).violations).toStrictEqual([]);
	});
});

describe('Conditional Child Nodes', () => {
	const config = {
		rule: {
			options: {
				evaluateConditionalChildNodes: true,
			},
		},
		parser: {
			'.*': '@markuplint/svelte-parser',
		},
	};

	test('if: details > summary', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<details>
{#if condition}
	<summary>summary</summary>
{/if}
body
</details>
`,
					config,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 1,
				message: 'Require an element. (Need "summary")',
				raw: '<details>',
			},
		]);
	});

	test('if: a > button', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<a href>
{#if condition}
	<button>Button</button>
{/if}
</a>
`,
					config,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 2,
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
				raw: '<button>',
			},
		]);
	});

	test('each: ul > li', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<ul>
{#each items as item}
	<span>{item}</span>
{/each}
	<li>default item</li>
</ul>
`,
					config,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 2,
				message: 'The "span" element is not allowed in the "ul" element in this context',
				raw: '<span>',
			},
		]);
	});
});

describe('Issues', () => {
	test('#396', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
					<table>
						<tbody>
						<tr>
							<td></td>
						</tr>
						</tbody>
						<tbody>
						<tr>
							<td></td>
						</tr>
						</tbody>
					</table>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('#398', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<table>
						<colgroup></colgroup><!-- ← error -->
						<colgroup><col /></colgroup><!-- ← no errors -->
						<colgroup span="1"></colgroup><!-- ← no errors -->
						<tbody>
							<tr>
								<td></td>
								<td></td>
								<td></td>
							</tr>
						</tbody>
					</table>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('#491', async () => {
		expect((await mlRuleTest(rule, '<hgroup><p>HEADING</p></hgroup>')).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<hgroup><h1>HEADING</h1></hgroup>')).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<hgroup><h2>HEADING</h1></hgroup>')).violations.length).toBe(0);
		expect(
			(await mlRuleTest(rule, '<hgroup><p>SUB</p><h1>HEADING</h1><p>SUB</p></hgroup>')).violations.length,
		).toBe(0);
	});

	test('#566', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<hgroup>
						<h1></h1>
						<h2></h2>
					</hgroup>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 7,
				message: 'The "h2" element is not allowed in the "hgroup" element in this context',
				raw: '<h2>',
			},
		]);
	});

	test('#606', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<dl>
					<template>
						<dt></dt>
						<dd></dd>
					</template>
				</dl>`,
				)
			).violations,
		).toStrictEqual([
			// https://github.com/markuplint/markuplint/issues/606#issuecomment-1345446732
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require one or more elements. (Need "dt")',
				raw: '<dl>',
			},
		]);
	});

	test('#617', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<head>
				<title>Title</title>
				<noscript>
					<style>
						.selector {}
					</style>
				</noscript></head>`,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<noscript>
					<style>
						.selector {}
					</style>
				</noscript>`,
				)
			).violations,
		).toStrictEqual([]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<div><noscript>
					<style>
						.selector {}
					</style>
				</noscript></div>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 6,
				message:
					'The "style" element is not allowed in the "div" element through the transparent model in this context',
				raw: '<style>',
			},
		]);
		expect(
			(
				await mlRuleTest(
					rule,
					`<span><noscript>
					<div>
					</div>
				</noscript></span>`,
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 6,
				message:
					'The "div" element is not allowed in the "span" element through the transparent model in this context',
				raw: '<div>',
			},
		]);
		expect(
			(
				await mlRuleTest(
					rule,
					`mixin meta(title)
	meta(charset="UTF-8")
	meta(name="viewport" content="width=device-width")
	title= title
	noscript
		style`,
					{
						parser: {
							'.*': '@markuplint/pug-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([]);
	});

	test('#637', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<ruby>漢<rp>（</rp><rt>かん</rt><rp>）</rp>字<rp>（</rp><rt>じ</rt><rp>）</rp></ruby>',
				)
			).violations,
		).toStrictEqual([]);

		expect(
			(await mlRuleTest(rule, '<ruby>A<rp></rp><rt></rt><rp></rp>B<rp></rp><rt></rt><rp></rp></ruby>'))
				.violations,
		).toStrictEqual([]);
	});

	test('#1046', async () => {
		const sourceCode = '<span><div></div></span>';
		expect(
			(
				await mlRuleTest(rule, sourceCode, {
					rule: {
						severity: 'warning',
					},
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 7,
				message: 'The "div" element is not allowed in the "span" element in this context',
				raw: '<div>',
			},
		]);
	});

	test('#1146', async () => {
		const sourceCode = '<datalist><option></option></datalist>';
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
	});

	test('#1023', async () => {
		const sourceCode = `<body>
	<h1>Reproduction</h1>
	<!-- There're typos. The intended element is x-item, not x-itm -->
	<x-container><x-itm></x-itm></x-container>
</body>`;
		expect(
			(
				await mlRuleTest(rule, sourceCode, {
					rule: [
						{
							tag: 'x-container',
							contents: [
								{
									require: 'x-item',
								},
							],
						},
					],
				})
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 4,
				col: 2,
				raw: '<x-container>',
				message: 'Require an element. (Need "x-item")',
			},
		]);
	});

	test('#1359', async () => {
		const sourceCode = '<svg><text><tspan>Text</tspan></text></svg>';
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
	});

	test('#1451', async () => {
		const astro = { parser: { '.*': '@markuplint/astro-parser' } };
		const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
		const pug = { parser: { '.*': '@markuplint/pug-parser' } };
		const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
		const vue = { parser: { '.*': '@markuplint/vue-parser' } };

		expect((await mlRuleTest(rule, '<span><div></div></span>')).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<span><Div></Div></span>')).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<span><div></div></span>', astro)).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<span><Div></Div></span>', astro)).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<span><div></div></span>', jsx)).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<span><Div></Div></span>', jsx)).violations.length).toBe(0);
		expect((await mlRuleTest(rule, 'span: div', pug)).violations.length).toBe(1);
		expect((await mlRuleTest(rule, 'span: Div', pug)).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<span><div></div></span>', svelte)).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<span><Div></Div></span>', svelte)).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<template><span><div></div></span></template>', vue)).violations.length).toBe(
			1,
		);
		expect((await mlRuleTest(rule, '<template><span><Div></Div></span></template>', vue)).violations.length).toBe(
			0,
		);
	});

	test('#1502', async () => {
		const sourceCode = `<svg>
	<defs>
		<filter>
			<feTurbulence />
		</filter>
	</defs>
</svg>`;
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
	});
});
