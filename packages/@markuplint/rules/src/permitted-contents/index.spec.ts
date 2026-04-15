import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[permitted-contents-invalid-001] a', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<a><div></div><span></span><em></em></a>');
		expect(violations1).toStrictEqual([]);

		const { violations: violations2 } = await mlRuleTest(rule, '<a><h1></h1></a>');
		expect(violations2).toStrictEqual([]);

		const { violations: violations3 } = await mlRuleTest(rule, '<div><a><option>x</option></a></div>');
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

	test('[permitted-contents-invalid-002] address', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<address><address></address></address>');
		expect(violations1).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "address" element is not allowed in the "address" element in this context',
				raw: '<address>',
			},
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "address" element must not appear as a descendant of the "address" element',
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
			{
				severity: 'error',
				line: 1,
				col: 25,
				message: 'The "address" element must not appear as a descendant of the "address" element',
				raw: '<address>',
			},
		]);
	});

	test('[permitted-contents-invalid-003] audio', async () => {
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

	test('[permitted-contents-invalid-004] dl', async () => {
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

	test('[permitted-contents-invalid-005] table', async () => {
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

	test('[permitted-contents-invalid-006] ruby', async () => {
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

	test('[permitted-contents-invalid-007] ul', async () => {
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

	// test('[permitted-contents-invalid-008] area', async () => {
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

	test('[permitted-contents-invalid-009] meta', async () => {
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

	test('[permitted-contents-invalid-010] hgroup', async () => {
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

	test('[permitted-contents-invalid-011] select', async () => {
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

	test('[permitted-contents-invalid-012] script', async () => {
		const { violations: violations1 } = await mlRuleTest(
			rule,
			`<script>
				alert("checking");
			</script>`,
		);
		expect(violations1).toStrictEqual([]);
	});

	test('[permitted-contents-invalid-013] style', async () => {
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

	test('[permitted-contents-invalid-014] Multiple', async () => {
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

	test('[permitted-contents-invalid-015] Dep exp named capture in interleave', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<figure><img><figcaption></figure>');
		expect(violations1).toStrictEqual([]);
	});

	test('[permitted-contents-invalid-016] Custom element', async () => {
		const { violations: violations1 } = await mlRuleTest(rule, '<div><x-item></x-item></div>');
		expect(violations1).toStrictEqual([]);
	});

	test('[permitted-contents-invalid-017] svg:a', async () => {
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

	test('[permitted-contents-invalid-018] svg:foreignObject', async () => {
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

	test('[permitted-contents-invalid-019] Interactive Element in SVG', async () => {
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

	test('[permitted-contents-invalid-020] mml:mfrac', async () => {
		// OK: exactly 2 children
		const { violations: v1 } = await mlRuleTest(rule, '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>');
		expect(v1).toStrictEqual([]);

		// NG: 3 children (too many)
		const { violations: v2 } = await mlRuleTest(rule, '<math><mfrac><mi>a</mi><mi>b</mi><mi>c</mi></mfrac></math>');
		expect(v2.length).toBeGreaterThan(0);
	});

	test('[permitted-contents-invalid-021] mml:math', async () => {
		// OK: MathML presentation elements
		const { violations: v1 } = await mlRuleTest(rule, '<math><mi>x</mi><mo>+</mo><mn>1</mn></math>');
		expect(v1).toStrictEqual([]);
	});

	test('[permitted-contents-valid-001] The SVG <image> element and the HTML obsolete <image> element', async () => {
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

	test('[permitted-contents-invalid-022] Custom element', async () => {
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

	test('[permitted-contents-invalid-023] special content models', async () => {
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

	test('[permitted-contents-parser-001] case-sensitive', async () => {
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

	test('[permitted-contents-parser-002] Components', async () => {
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

	test('[permitted-contents-parser-003] Expect to contain a text node', async () => {
		expect((await mlRuleTest(rule, '<head><title>{variable}</title></head>')).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<head><title>\n</title></head>')).violations).toStrictEqual([
			expect.objectContaining({
				severity: 'error',
				raw: '<title>',
				message: 'Require an element. (Need "#nonEmptyText")',
			}),
		]);
		expect((await mlRuleTest(rule, '<head><title>\n</title></head>', jsxRuleOn)).violations).toStrictEqual([
			expect.objectContaining({
				severity: 'error',
				raw: '<title>',
				message: 'Require an element. (Need "#nonEmptyText")',
			}),
		]);
		expect((await mlRuleTest(rule, '<head><title>_variable_</title></head>', jsxRuleOn)).violations).toStrictEqual(
			[],
		);
		expect((await mlRuleTest(rule, '<head><title>{variable}</title></head>', jsxRuleOn)).violations).toStrictEqual(
			[],
		);
	});

	test('[permitted-contents-parser-004] Element has only custom components', async () => {
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

	test('[permitted-contents-invalid-024] Element', async () => {
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

	test('[permitted-contents-invalid-025] Attr', async () => {
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

	test('[permitted-contents-invalid-026] The `as` attribute', async () => {
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

	test('[permitted-contents-parser-005] Element has only custom components', async () => {
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

	test('[permitted-contents-parser-006] PSBlock', async () => {
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

	test('[permitted-contents-parser-007] PSBlock', async () => {
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

	test('[permitted-contents-invalid-027] if: details > summary', async () => {
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

	test('[permitted-contents-invalid-028] if: a > button', async () => {
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

	test('[permitted-contents-invalid-029] each: ul > li', async () => {
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

describe('Loop blocks', () => {
	test('[permitted-contents-parser-008] Svelte', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<dl>
	{#each items as item}
		<dt>{item.key}</dt>
	{/each}
</dl>
<dl>
	{#each items as item}
		<dt>{item.key}</dt>
		<dd>{item.value}</dd>
	{/each}
</dl>
		`,
					{
						parser: {
							'.*': '@markuplint/svelte-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 1,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl>',
			},
		]);
	});

	test('[permitted-contents-parser-009] Vue', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<template>
	<dl v-for="item in items">
		<dt>{item.key}</dt>
	</dl>
	<dl v-for="item in items">
		<dt>{item.key}</dt>
		<dd>{item.value}</dd>
	</dl>
</template>
		`,
					{
						parser: {
							'.*': '@markuplint/vue-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 2,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl v-for="item in items">',
			},
		]);
	});

	test('[permitted-contents-parser-010] Pug', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
dl
	each item in items
		dt= item.key
dl
	each item in items
		dt= item.key
		dd= item.value
		`,
					{
						parser: {
							'.*': '@markuplint/pug-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 1,
				message: 'Require one or more elements. (Need "dd")',
				raw: 'dl',
			},
		]);
	});

	test('[permitted-contents-parser-011] Alpine', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<dl>
	<template x-for="color in items" :key="color.id">
		<dt>{item.key}</dt>
	</template>
</dl>
<dl>
	<template x-for="color in items" :key="color.id">
		<dt>{item.key}</dt>
		<dd>{item.value}</dd>
	</template>
</dl>
		`,
					{
						parser: {
							'.*': '@markuplint/alpine-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 2,
				col: 1,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl>',
			},
		]);
	});

	test('[permitted-contents-parser-012] JSX', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<>
	<dl>
		{items.map(item => (
			<dt>{item}</dt>
		))}
	</dl>
	<dl>
		{items.map(item => (
			<>
				<dt>{item.key}</dt>
				<dd>{item.value}</dd>
			</>
		))}
	</dl>
	<dl>
		{/* No rendering loop */}
		{items.forEach(item => (
			<>
				<dt>{item.key}</dt>
			</>
		))}
	</dl>
</>
		`,
					{
						parser: {
							'.*': '@markuplint/jsx-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 2,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl>',
			},
		]);
	});

	test('[permitted-contents-parser-013] Astro', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`
<>
	<dl>
		{items.map(item => (
			<dt>{item}</dt>
		))}
	</dl>
	<dl>
		{items.map(item => (
			<>
				<dt>{item.key}</dt>
				<dd>{item.value}</dd>
			</>
		))}
	</dl>
	<dl>
		{/* No rendering loop */}
		{items.forEach(item => (
			<>
				<dt>{item.key}</dt>
			</>
		))}
	</dl>
</>
		`,
					{
						parser: {
							'.*': '@markuplint/astro-parser',
						},
					},
				)
			).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 2,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl>',
			},
		]);
	});
});

describe('Issues', () => {
	test('[permitted-contents-issue-396] #396', async () => {
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

	test('[permitted-contents-issue-398] #398', async () => {
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

	test('[permitted-contents-issue-491] #491', async () => {
		expect((await mlRuleTest(rule, '<hgroup><p>HEADING</p></hgroup>')).violations.length).toBe(1);
		expect((await mlRuleTest(rule, '<hgroup><h1>HEADING</h1></hgroup>')).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<hgroup><h2>HEADING</h1></hgroup>')).violations.length).toBe(0);
		expect(
			(await mlRuleTest(rule, '<hgroup><p>SUB</p><h1>HEADING</h1><p>SUB</p></hgroup>')).violations.length,
		).toBe(0);
	});

	test('[permitted-contents-issue-566] #566', async () => {
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

	test('[permitted-contents-issue-606] #606', async () => {
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

	test('[permitted-contents-issue-617] #617', async () => {
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

	test('[permitted-contents-issue-637] #637', async () => {
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

	test('[permitted-contents-issue-1046] #1046', async () => {
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

	test('[permitted-contents-issue-1146] #1146', async () => {
		const sourceCode = '<datalist><option></option></datalist>';
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-1023] #1023', async () => {
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

	test('[permitted-contents-issue-1359] #1359', async () => {
		const sourceCode = '<svg><text><tspan>Text</tspan></text></svg>';
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-1451] #1451', async () => {
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

	test('[permitted-contents-issue-1502] #1502', async () => {
		const sourceCode = `<svg>
	<defs>
		<filter>
			<feTurbulence />
		</filter>
	</defs>
</svg>`;
		expect((await mlRuleTest(rule, sourceCode)).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-1767] #1767', async () => {
		const parser = {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		} as const;
		expect((await mlRuleTest(rule, '<div><><span></span></></div>', parser)).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<ul><><li></li></></ul>', parser)).violations.length).toBe(0);
		expect((await mlRuleTest(rule, '<ul><><div></div></></ul>', parser)).violations.length).toBe(1);
	});

	test('[permitted-contents-issue-1848] #1848', async () => {
		const sourceCode = '<XComponent></XComponent>';
		expect(
			(
				await mlRuleTest(rule, sourceCode, {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					pretenders: [
						{
							selector: 'XComponent',
							as: 'Head',
						},
					],
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[permitted-contents-issue-2302] #2302', async () => {
		const sourceCode = `
<svg>
	{list.map(item => (
		<path />
	))}
</svg>
`;
		expect(
			(
				await mlRuleTest(rule, sourceCode, {
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
				})
			).violations,
		).toStrictEqual([]);
	});

	// Timeout: 5s — the old Cartesian-product algorithm took 30s+ for this case;
	// the incremental algorithm completes in <100ms.
	test('[permitted-contents-issue-3249] #3249 - many transparent siblings should not cause exponential slowdown', async () => {
		const anchors = Array.from({ length: 12 }, (_, i) => `<a><span>link${i}</span><em>text${i}</em></a>`).join(
			'\n',
		);
		const sourceCode = `<div>${anchors}</div>`;

		const { violations } = await mlRuleTest(rule, sourceCode);
		expect(violations).toStrictEqual([]);
	}, 5000);

	test('[permitted-contents-issue-3632-001] main must not be descendant of article', async () => {
		const { violations } = await mlRuleTest(rule, '<article><main>x</main></article>');
		expect(violations).toContainEqual(
			expect.objectContaining({
				message: 'The "main" element must not appear as a descendant of the "article" element',
			}),
		);
	});

	test('[permitted-contents-issue-3632-002] main standalone is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<main>x</main>');
		const ancestorViolations = violations.filter(v => v.message.includes('must not appear'));
		expect(ancestorViolations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3632-003] main in deeply nested nav', async () => {
		const { violations } = await mlRuleTest(rule, '<nav><div><div><main>x</main></div></div></nav>');
		expect(violations).toContainEqual(
			expect.objectContaining({
				message: 'The "main" element must not appear as a descendant of the "nav" element',
			}),
		);
	});

	test('[permitted-contents-issue-3670-001] area outside map is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<div><area alt="x" href="#"></div>');
		const descendantViolations = violations.filter(v => v.message?.includes('must appear as a descendant'));
		expect(descendantViolations).toStrictEqual([
			expect.objectContaining({
				severity: 'error',
				message: 'The "area" element must appear as a descendant of the "map" element',
			}),
		]);
	});

	test('[permitted-contents-issue-3670-002] area inside map is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<map name="m"><area alt="x" href="#"></map>');
		const descendantViolations = violations.filter(v => v.message?.includes('descendant'));
		expect(descendantViolations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3670-003] area inside deeply nested map has no descendantOf violation', async () => {
		const { violations } = await mlRuleTest(rule, '<map name="m"><div><p><area alt="x" href="#"></p></div></map>');
		const descendantViolations = violations.filter(v => v.message?.includes('descendant'));
		expect(descendantViolations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3640-001] multiple track default is invalid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></video>',
		);
		const uniqueViolations = violations.filter(v => v.message?.includes('"default" attribute'));
		expect(uniqueViolations).toStrictEqual([
			expect.objectContaining({
				severity: 'error',
				raw: '<track kind="captions" src="b.vtt" default>',
				message:
					'The "default" attribute must not appear on more than one "track" element within the same parent',
			}),
		]);
	});

	test('[permitted-contents-issue-3640-002] single track default is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<video><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt"></video>',
		);
		const uniqueViolations = violations.filter(v => v.message?.includes('"default" attribute'));
		expect(uniqueViolations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3640-003] multiple track default in audio is invalid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<audio><track kind="subtitles" src="a.vtt" default><track kind="captions" src="b.vtt" default></audio>',
		);
		const uniqueViolations = violations.filter(v => v.message?.includes('"default" attribute'));
		expect(uniqueViolations).toStrictEqual([
			expect.objectContaining({
				severity: 'error',
				raw: '<track kind="captions" src="b.vtt" default>',
				message:
					'The "default" attribute must not appear on more than one "track" element within the same parent',
			}),
		]);
	});

	test('[permitted-contents-issue-3635-001] empty title is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><title></title></head><body></body></html>');
		expect(violations).toContainEqual(
			expect.objectContaining({
				severity: 'error',
				raw: '<title>',
				message: 'Require an element. (Need "#nonEmptyText")',
			}),
		);
	});

	test('[permitted-contents-issue-3635-002] whitespace-only title is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><title>  </title></head><body></body></html>');
		expect(violations).toContainEqual(
			expect.objectContaining({
				severity: 'error',
				raw: '<title>',
				message: 'Require an element. (Need "#nonEmptyText")',
			}),
		);
	});

	test('[permitted-contents-issue-3635-003] non-empty title is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Page Title</title></head><body></body></html>',
		);
		const titleViolations = violations.filter(v => v.raw?.includes('title'));
		expect(titleViolations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3635-004] empty option without label is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<select><option></option></select>');
		expect(violations).toContainEqual(
			expect.objectContaining({
				severity: 'error',
				raw: '<option>',
				message: 'Require an element. (Need "#nonEmptyText")',
			}),
		);
	});

	test('[permitted-contents-issue-3635-005] option with label can be empty', async () => {
		const { violations } = await mlRuleTest(rule, '<select><option label="x" value="v"></option></select>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3635-006] option with text content is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<select><option>Text</option></select>');
		const optionViolations = violations.filter(v => v.raw?.includes('option'));
		expect(optionViolations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3632-004] footer in header', async () => {
		const { violations } = await mlRuleTest(rule, '<header><footer>x</footer></header>');
		expect(violations).toContainEqual(
			expect.objectContaining({
				message: 'The "footer" element must not appear as a descendant of the "header" element',
			}),
		);
	});

	// #3592: empty dl is valid (zero or more groups)
	test('[permitted-contents-issue-3592-001] empty dl is valid', async () => {
		expect((await mlRuleTest(rule, '<dl></dl>')).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3592-002] dl with dt+dd is still valid', async () => {
		expect((await mlRuleTest(rule, '<dl><dt>term</dt><dd>def</dd></dl>')).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3592-003] dl with div is still valid', async () => {
		expect((await mlRuleTest(rule, '<dl><div><dt>term</dt><dd>def</dd></div></dl>')).violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3592-004] dl with only dt is still invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<dl><dt>term</dt></dl>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require one or more elements. (Need "dd")',
				raw: '<dl>',
			},
		]);
	});

	test('[permitted-contents-issue-3592-005] dl with only dd is still invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<dl><dd>def</dd></dl>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'Require one or more elements. (Need "dt")',
				raw: '<dl>',
			},
		]);
	});

	test('[permitted-contents-issue-3592-006] dl with multiple dt+dd groups is valid', async () => {
		expect((await mlRuleTest(rule, '<dl><dt>a</dt><dd>b</dd><dt>c</dt><dd>d</dd></dl>')).violations).toStrictEqual(
			[],
		);
	});
});

describe('#3739 (pretender + user tag rule)', () => {
	const breadcrumbsConfig = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		pretenders: [
			{ selector: 'Breadcrumbs', as: 'nav' },
			{ selector: 'BreadcrumbsLabel', as: 'span' },
			{ selector: 'BreadcrumbList', as: 'ol' },
			{ selector: 'BreadcrumbItem', as: 'li' },
			{ selector: 'BreadcrumbLink', as: 'a' },
		],
		rule: [
			{
				tag: 'Breadcrumbs',
				contents: [{ optional: 'BreadcrumbsLabel' }, { require: 'BreadcrumbList' }],
			},
			{
				tag: 'BreadcrumbList',
				contents: [{ oneOrMore: 'BreadcrumbItem' }],
			},
			{
				tag: 'BreadcrumbItem',
				contents: [{ require: 'BreadcrumbLink' }],
			},
			{
				tag: 'BreadcrumbLink',
				contents: [{ require: '#text' }],
			},
		],
	};

	test('[permitted-contents-issue-3739-001] origin-mode reports a violation for disallowed child between optional and require', async () => {
		// The sequential content-model matcher consumes `<BreadcrumbsLabel>` for the
		// `optional` slot and then expects `<BreadcrumbList>` next. `<div>` breaks
		// the sequence so the violation is reported as a missing required element
		// on `<Breadcrumbs>` — the same wording produced for the non-pretendered
		// path. The critical regression guard is that *some* violation is now
		// reported (previously the rule was silently bypassed).
		const source =
			'<Breadcrumbs>' +
			'<BreadcrumbsLabel>Label</BreadcrumbsLabel>' +
			'<div>UNEXPECTED</div>' +
			'<BreadcrumbList>' +
			'<BreadcrumbItem><BreadcrumbLink>Home</BreadcrumbLink></BreadcrumbItem>' +
			'</BreadcrumbList>' +
			'</Breadcrumbs>';
		const { violations } = await mlRuleTest(rule, source, breadcrumbsConfig);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<Breadcrumbs>',
				message: 'Require an element. (Need "BreadcrumbList")',
			},
		]);
	});

	test('[permitted-contents-issue-3739-002] user-model satisfied produces no origin-mode violation', async () => {
		const source =
			'<Breadcrumbs>' +
			'<BreadcrumbsLabel>Label</BreadcrumbsLabel>' +
			'<BreadcrumbList>' +
			'<BreadcrumbItem><BreadcrumbLink>Home</BreadcrumbLink></BreadcrumbItem>' +
			'</BreadcrumbList>' +
			'</Breadcrumbs>';
		const { violations } = await mlRuleTest(rule, source, breadcrumbsConfig);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3739-003] pretended-mode still detects HTML-spec violation', async () => {
		// <Section> pretends to <section>, user declares it may contain only <BreadcrumbList>.
		// In origin mode the child <Breadcrumbs> is disallowed; in pretended mode <section>
		// permits flow content so pretended mode does not fire. Ensures the pretended path
		// keeps working when the user rule restricts it further.
		const source = '<Section><Nope/></Section>';
		const { violations } = await mlRuleTest(rule, source, {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [
				{ selector: 'Section', as: 'section' },
				{ selector: 'Nope', as: 'div' },
			],
			rule: [
				{
					tag: 'Section',
					contents: [{ require: 'BreadcrumbList' }],
				},
			],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<Section>',
				message: 'Require an element. (Need "BreadcrumbList")',
			},
		]);
	});
});
