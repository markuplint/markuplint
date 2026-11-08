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
			`<ruby>
				♥ <rt> Heart <rt lang=fr> Cœur </rt>
				☘ <rt> Shamrock <rt lang=fr> Trèfle </rt>
				✶ <rt> Star <rt lang=fr> Étoile </rt>
			</ruby>`,
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

		// SVG2 §17.6 — "may contain any element that its parent may contain,
		// except itself". Direct nested <svg|a> must be rejected.
		const { violations: violations3 } = await mlRuleTest(rule, '<svg><a href="#"><a href="#">nested</a></a></svg>');
		expect(violations3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 18,
				message: 'The "a" element is a transparent model but also disallows the "a" element in this context',
				raw: '<a href="#">',
			},
		]);

		// Transitive nesting (via <g>) must also be rejected. The primary
		// violation is the inner <a>: the spec change (`:has(svg|a)` in the
		// transparent expression) is what catches it. The follow-up text
		// violation is INCIDENTAL — it falls out of how the engine surfaces
		// children of a transparent-rejected node, and may shift if that
		// propagation logic changes. Treat only the first entry as the
		// load-bearing assertion for this PR.
		const { violations: violations4 } = await mlRuleTest(
			rule,
			'<svg><a href="#"><g><a href="#">nested</a></g></a></svg>',
		);
		expect(violations4[0]).toStrictEqual({
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "a" element is a transparent model but also disallows the "a" element in this context',
			raw: '<a href="#">',
		});
	});

	test('[permitted-contents-valid-002] svg:a wrapping <g> without nested <a>', async () => {
		// Regression guard: the `:has(svg|a)` constraint added for
		// invalid-017 must not over-fire on wrappers that legitimately do
		// not contain another <a>.
		const { violations } = await mlRuleTest(
			rule,
			'<svg><a href="#"><g><rect width="10" height="10"/></g></a></svg>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-invalid-030] svg:a self-nesting inside svg:switch', async () => {
		// Covers the conditional `svg|switch > svg|a` branch of spec.svg_a.jsonc.
		// SVG2 §17.6's self-exclusion applies in this context too; without this
		// test, deleting the conditional-branch fix would not break any test.
		const { violations } = await mlRuleTest(
			rule,
			'<svg><switch><a href="#"><a href="#">nested</a></a></switch></svg>',
		);
		expect(violations[0]).toStrictEqual({
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "a" element is a transparent model but also disallows the "a" element in this context',
			raw: '<a href="#">',
		});
	});

	test('[permitted-contents-invalid-031] svg:a self-nesting via svg:defs wrapper', async () => {
		// Wrapper-agnostic check: `:has(svg|a)` should reject any element that
		// contains an <a>, regardless of which container is used.
		const { violations } = await mlRuleTest(rule, '<svg><a href="#"><defs><a href="#">nested</a></defs></a></svg>');
		expect(violations[0]).toStrictEqual({
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "a" element is a transparent model but also disallows the "a" element in this context',
			raw: '<a href="#">',
		});
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

		// NG: 3 children (too many) — third child triggers the max overflow.
		const { violations: v2 } = await mlRuleTest(rule, '<math><mfrac><mi>a</mi><mi>b</mi><mi>c</mi></mfrac></math>');
		expect(v2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 34,
				message: 'There is more content than it needs. the max number of elements required is two',
				raw: '<mi>',
			},
		]);

		// NG: 1 child (MathML Core §3.3.2 — mfrac requires exactly two children).
		// The previous spec used `oneOrMore` with `max: 2`, which silently
		// allowed a single child. Locks down the require/min:2 fix.
		const { violations: v3 } = await mlRuleTest(rule, '<math><mfrac><mi>a</mi></mfrac></math>');
		expect(v3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Require an element. (Need ":model(MathMLPresentation)")',
				raw: '<mfrac>',
			},
		]);
	});

	test('[permitted-contents-invalid-021] mml:math', async () => {
		// OK: MathML presentation elements
		const { violations: v1 } = await mlRuleTest(rule, '<math><mi>x</mi><mo>+</mo><mn>1</mn></math>');
		expect(v1).toStrictEqual([]);

		// NG: <mtr> is parent-restricted to <mtable> (MathML Core §3.5.2)
		// and must not appear directly under <math>.
		const { violations: v2 } = await mlRuleTest(rule, '<math><mtr><mtd><mn>1</mn></mtd></mtr></math>');
		expect(v2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'The "mtr" element is not allowed in the "math" element in this context',
				raw: '<mtr>',
			},
		]);

		// NG: <annotation> is parent-restricted to <semantics> (MathML Core §3.7)
		// and must not appear directly under <math>.
		const { violations: v3 } = await mlRuleTest(rule, '<math><annotation>note</annotation></math>');
		expect(v3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'The "annotation" element is not allowed in the "math" element in this context',
				raw: '<annotation>',
			},
		]);

		// NG: <mprescripts> is parent-restricted to <mmultiscripts> (MathML Core §3.4.3).
		const { violations: v4 } = await mlRuleTest(rule, '<math><mprescripts/></math>');
		expect(v4).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'The "mprescripts" element is not allowed in the "math" element in this context',
				raw: '<mprescripts/>',
			},
		]);

		// OK regression: properly wrapped <annotation> inside <semantics>.
		const { violations: v5 } = await mlRuleTest(
			rule,
			'<math><semantics><mrow><mi>x</mi></mrow><annotation>x</annotation></semantics></math>',
		);
		expect(v5).toStrictEqual([]);

		// OK regression: properly wrapped <mtr> inside <mtable>.
		const { violations: v6 } = await mlRuleTest(
			rule,
			'<math><mtable><mtr><mtd><mn>1</mn></mtd></mtr></mtable></math>',
		);
		expect(v6).toStrictEqual([]);

		// Note: `<math>` directly inside `<head>` (the html-math/math-in-head
		// fixture) is NOT covered here. The HTML5 parser auto-corrects the
		// `<math>` element out of `<head>` into `<body>` before rule
		// evaluation, so a content-model fix at the `<head>` spec data level
		// cannot reach it. Tracked under #3844 (parser-level error gap).
	});

	test('[permitted-contents-invalid-032] mml:msubsup arity (exactly 3 children)', async () => {
		// MathML Core §3.4.1 — msubsup requires exactly three children
		// (base, subscript, superscript). Representative spec test for the
		// arity-3 group (covers munderover by analogy).

		// OK: exactly 3 children
		const { violations: v1 } = await mlRuleTest(
			rule,
			'<math><msubsup><mi>x</mi><mn>0</mn><mn>1</mn></msubsup></math>',
		);
		expect(v1).toStrictEqual([]);

		// NG: 2 children (one short)
		const { violations: v2 } = await mlRuleTest(rule, '<math><msubsup><mi>x</mi><mn>0</mn></msubsup></math>');
		expect(v2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Require an element. (Need ":model(MathMLPresentation)")',
				raw: '<msubsup>',
			},
		]);

		// NG: 4 children (one over)
		const { violations: v3 } = await mlRuleTest(
			rule,
			'<math><msubsup><mi>x</mi><mn>0</mn><mn>1</mn><mn>2</mn></msubsup></math>',
		);
		expect(v3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message: 'There is more content than it needs. the max number of elements required is three',
				raw: '<mn>',
			},
		]);
	});

	test('[permitted-contents-invalid-033] mml:mover arity (broader selector with annotation)', async () => {
		// MathML Core §3.4.2 — mover requires exactly two children. Distinct
		// from mfrac in that the permitted-content selector also accepts
		// `mml|annotation` and `mml|annotation-xml`. Guards against a future
		// edit that removes either selector by mistake.

		// OK: exactly 2 children
		const { violations: v1 } = await mlRuleTest(rule, '<math><mover><mi>x</mi><mo>~</mo></mover></math>');
		expect(v1).toStrictEqual([]);

		// NG: 1 child
		const { violations: v2 } = await mlRuleTest(rule, '<math><mover><mi>x</mi></mover></math>');
		expect(v2).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Require an element. (Need ":model(MathMLPresentation)")',
				raw: '<mover>',
			},
		]);

		// NG: 3 children
		const { violations: v3 } = await mlRuleTest(rule, '<math><mover><mi>x</mi><mo>~</mo><mi>y</mi></mover></math>');
		expect(v3).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 34,
				message: 'There is more content than it needs. the max number of elements required is two',
				raw: '<mi>',
			},
		]);
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
		).toStrictEqual([]);
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

	// HTML LS §4.4.9: div inside dl allows exactly one group (dt+ dd+),
	// not repeated groups. Group repetition is expressed at the dl level.
	test('[permitted-contents-invalid-034] div in dl with multiple dt+dd groups is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<dl><div><dt>a</dt><dd>b</dd><dt>c</dt><dd>d</dd></div></dl>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 30,
				message: 'The "dt" element is not allowed in the "div" element in this context',
				raw: '<dt>',
			},
		]);
	});

	test('[permitted-contents-valid-003] div in dl with single dt+dd group is valid', async () => {
		expect(
			(await mlRuleTest(rule, '<dl><div><dt>a</dt><dt>b</dt><dd>c</dd><dd>d</dd></div></dl>')).violations,
		).toStrictEqual([]);
	});

	// #3928: a transparent-content-model element (e.g. <a>, <audio>, <ins>) must
	// still be evaluated against the parent's own content model at its own
	// position — the transparent flattening that lets its children pass through
	// must not make the element itself disappear from that check.
	test('[permitted-contents-issue-3928-001] a[href] (interactive) directly inside button is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<button><a href="/x"><span>text</span></a></button>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: '<a href="/x">',
				message: 'The "a" element is not allowed in the "button" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-3928-002] audio[controls] (interactive) directly inside button is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<button><audio controls></audio></button>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: '<audio controls>',
				message: 'The "audio" element is not allowed in the "button" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-3928-003] video directly inside picture is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><video></video><img src="x" alt=""></picture>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<picture>',
				message: 'Require an element. (Need "img")',
			},
		]);
	});

	test('[permitted-contents-issue-3928-004] audio directly inside picture is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><audio></audio><img src="x" alt=""></picture>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<picture>',
				message: 'Require an element. (Need "img")',
			},
		]);
	});

	test('[permitted-contents-issue-3928-005] canvas directly inside picture is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><canvas></canvas><img src="x" alt=""></picture>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<picture>',
				message: 'Require an element. (Need "img")',
			},
		]);
	});

	test('[permitted-contents-issue-3928-006] a wrapping img directly inside picture is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><a><img src="x" alt=""></a></picture>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<picture>',
				message: 'Require an element. (Need "img")',
			},
		]);
	});

	test('[permitted-contents-issue-3928-007] ins directly inside picture is invalid', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><ins></ins><img src="x" alt=""></picture>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<picture>',
				message: 'Require an element. (Need "img")',
			},
		]);
	});

	test('[permitted-contents-issue-3928-008] non-interactive a inside button stays valid', async () => {
		// <a> without href is not interactive content, so it remains permitted
		// phrasing content — the fix must not flag benign transparent usage.
		const { violations } = await mlRuleTest(rule, '<button><a>text</a></button>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3928-009] a[href] wrapping phrasing content inside p stays valid', async () => {
		const { violations } = await mlRuleTest(rule, '<p><a href="#">text</a></p>');
		expect(violations).toStrictEqual([]);
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

	test('[permitted-contents-issue-3739-003] origin-mode reports missing required child when the user model is stricter than the pretended spec', async () => {
		// `<Section>` pretends to `<section>` (flow content, permissive); the
		// pretended pass alone would happily accept `<Nope>/<div>`. The user
		// tag rule is only consulted in origin mode, where it requires a
		// `<BreadcrumbList>` child — which is absent — so origin mode reports
		// the violation. This pins the fact that origin mode can report
		// violations that pretended mode silently allows.
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

	test('[permitted-contents-issue-3739-004] pretended-mode detects HTML-spec violation independently of origin user rule', async () => {
		// `<Opt>` pretends to `<option>` whose content model is text-only.
		// The user tag rule on `<Opt>` permits any combination of text and
		// `<Span>`, so origin mode has no objection. Embedding `<Span>`
		// (pretends to `<span>`) as a child must still be rejected by the
		// pretended pass because HTML's `<option>` forbids element children.
		// Ensures the historical pretended-mode path is not weakened by the
		// new origin-mode plumbing.
		const source = '<Opt>Label<Span>nope</Span></Opt>';
		const { violations } = await mlRuleTest(rule, source, {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [
				{ selector: 'Opt', as: 'option' },
				{ selector: 'Span', as: 'span' },
			],
			rule: [{ tag: 'Opt', contents: [{ zeroOrMore: ['#text', 'Span'] }] }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 11,
				raw: '<Span>',
				message: 'The "span" element is not allowed in the "option" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-3739-005] origin-mode handles transparent-model pretender children', async () => {
		// `<MyLink>` pretends to `<a>`, whose content model is transparent.
		// The surrounding `<p>`-pretending `<Para>` declares a user rule that
		// allows an `<a>`. Origin mode must recurse into the transparent
		// child's content model via `resolveContentModel` without losing the
		// mode, and the user model on the ancestor must not be disrupted by
		// the transparent recursion.
		const source = '<Para><MyLink>text</MyLink></Para>';
		const { violations } = await mlRuleTest(rule, source, {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [
				{ selector: 'Para', as: 'p' },
				{ selector: 'MyLink', as: 'a' },
			],
			rule: [{ tag: 'Para', contents: [{ oneOrMore: 'MyLink' }] }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3739-006] origin-mode evaluates choice patterns under pretender', async () => {
		// The user rule on `<Switcher>` uses a `choice` pattern so mode
		// propagation through `choice.ts` is exercised. Branch A requires a
		// `<CaseA>`; Branch B requires a `<CaseB>`. Supplying `<CaseB>` must
		// satisfy the second branch. This guarantees the mode argument flows
		// through choice → order → recursiveBranch correctly.
		const source = '<Switcher><CaseB/></Switcher>';
		const { violations } = await mlRuleTest(rule, source, {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [
				{ selector: 'Switcher', as: 'div' },
				{ selector: 'CaseA', as: 'span' },
				{ selector: 'CaseB', as: 'em' },
			],
			rule: [
				{
					tag: 'Switcher',
					contents: [{ choice: [[{ require: 'CaseA' }], [{ require: 'CaseB' }]] }],
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3739-007] origin-mode does not fire when the user has no rule for rawName', async () => {
		// Pretender is active but the user defined no tag rule keyed on the
		// component name. The walkOn guard in index.ts should therefore NOT
		// enqueue origin mode, so the only pass that runs is pretended mode
		// and there should be no spurious origin-mode noise. Functions as a
		// regression test for the mode enablement guard.
		const source = '<Widget><div>ok</div></Widget>';
		const { violations } = await mlRuleTest(rule, source, {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [{ selector: 'Widget', as: 'section' }],
			// No `rule:` entry for Widget — origin mode must stay dormant.
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3739-010] origin-mode rejects a native child that coincides with the pretender target name', async () => {
		// The full Breadcrumbs family of pretenders AND user tag rules is
		// wired up, matching the production-style config. Inside a
		// `<BreadcrumbList>` (which pretends to `<ol>` and has a user rule
		// requiring `<BreadcrumbItem>`) we drop a raw `<li>`. In the
		// pretended pass `<ol>` happily accepts `<li>`; in the origin pass
		// the user selector `BreadcrumbItem` must NOT match the native
		// `<li>`. This pins that the `<li>`/`BreadcrumbItem` name collision
		// does not leak across modes.
		const source = '<BreadcrumbList><li>native</li></BreadcrumbList>';
		const { violations } = await mlRuleTest(rule, source, breadcrumbsConfig);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<BreadcrumbList>',
				message: 'Require one or more elements. (Need "BreadcrumbItem")',
			},
		]);
	});

	test('[permitted-contents-issue-3739-011] native parent without a user rule passes even when pretendered children are present', async () => {
		// Again the full Breadcrumbs family is configured, but the parent
		// here is a raw `<ul>` for which no user tag rule exists. The
		// `rules.some(r => r.tag === el.rawName)` guard must keep origin
		// mode dormant on `<ul>`, so only the pretended pass runs: `<ul>`
		// accepts the pretendered `<li>` (originally `<BreadcrumbItem>`)
		// and the tree is valid. Pins that mode enablement is per-parent —
		// a pretendered child does not drag origin mode onto its parent.
		const source = '<ul><BreadcrumbItem><BreadcrumbLink>Home</BreadcrumbLink></BreadcrumbItem></ul>';
		const { violations } = await mlRuleTest(rule, source, breadcrumbsConfig);
		expect(violations).toStrictEqual([]);
	});
});

describe('#4099 (pretender inside a content model that includes #custom)', () => {
	const jsxConfig = {
		parser: { '.*': '@markuplint/jsx-parser' },
	};

	test('[permitted-contents-issue-4099-001] p rejects a pretender that stands for section', async () => {
		const { violations } = await mlRuleTest(rule, '<p><Panel/></p>', {
			...jsxConfig,
			pretenders: [{ selector: 'Panel', as: 'section' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				raw: '<Panel/>',
				message: 'The "section" element is not allowed in the "p" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4099-002] span rejects a pretender that stands for section', async () => {
		const { violations } = await mlRuleTest(rule, '<span><Panel/></span>', {
			...jsxConfig,
			pretenders: [{ selector: 'Panel', as: 'section' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<Panel/>',
				message: 'The "section" element is not allowed in the "span" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4099-003] button rejects a pretender that stands for section', async () => {
		const { violations } = await mlRuleTest(rule, '<button><Panel/></button>', {
			...jsxConfig,
			pretenders: [{ selector: 'Panel', as: 'section' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: '<Panel/>',
				message: 'The "section" element is not allowed in the "button" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4099-004] p accepts a pretender that stands for span', async () => {
		const { violations } = await mlRuleTest(rule, '<p><Panel/></p>', {
			...jsxConfig,
			pretenders: [{ selector: 'Panel', as: 'span' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4099-005] p accepts a pretender that stands for a custom element name', async () => {
		const { violations } = await mlRuleTest(rule, '<p><Panel/></p>', {
			...jsxConfig,
			pretenders: [{ selector: 'Panel', as: 'my-element' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4099-006] a transparent a inside p rejects a pretender that stands for section', async () => {
		const { violations } = await mlRuleTest(rule, '<p><a href="#"><Panel/></a></p>', {
			...jsxConfig,
			pretenders: [{ selector: 'Panel', as: 'section' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 16,
				raw: '<Panel/>',
				message:
					'The "section" element is not allowed in the "p" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4099-007] origin mode still treats the pretender as an authored element', async () => {
		const { violations } = await mlRuleTest(rule, '<Para><Panel/></Para>', {
			...jsxConfig,
			pretenders: [
				{ selector: 'Para', as: 'p' },
				{ selector: 'Panel', as: 'span' },
			],
			rule: [{ tag: 'Para', contents: [{ zeroOrMore: '#phrasing' }] }],
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('a pretender whose target is a component name that could not be resolved', () => {
	const jsxConfig = {
		parser: { '.*': '@markuplint/jsx-parser' },
	};

	test.each(['Tabs.Root', 'motion.div', 'Comp', 'ExternalDialog'])(
		'[permitted-contents-issue-4231-001] div accepts a pretender that stands for the component "%s"',
		async target => {
			const { violations } = await mlRuleTest(rule, '<div><MyTabs/></div>', {
				...jsxConfig,
				pretenders: [{ selector: 'MyTabs', as: target }],
			});
			expect(violations).toStrictEqual([]);
		},
	);

	test('[permitted-contents-issue-4231-002] p accepts a pretender that stands for a component, as it accepts the component itself', async () => {
		const { violations } = await mlRuleTest(rule, '<p><MyTabs/></p>', {
			...jsxConfig,
			pretenders: [{ selector: 'MyTabs', as: 'Tabs.Root' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4231-003] a document that ignores the case of tag names accepts a pretender that stands for a component', async () => {
		const { violations } = await mlRuleTest(rule, '<template><p><MyTabs></MyTabs></p></template>', {
			parser: { '.*': '@markuplint/vue-parser' },
			pretenders: [{ selector: 'MyTabs', as: 'RouterLink' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4231-004] HTML accepts a pretender that stands for a component', async () => {
		const { violations } = await mlRuleTest(rule, '<p><MyTabs></MyTabs></p>', {
			pretenders: [{ selector: 'MyTabs', as: 'Tabs.Root' }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4231-005] the children given to a pretender that stands for a component are still checked against its slot wrapper', async () => {
		const { violations } = await mlRuleTest(rule, '<MyList><div/></MyList>', {
			...jsxConfig,
			pretenders: [{ selector: 'MyList', as: { element: 'ScrollArea.Root', slots: [{ element: 'ul' }] } }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: '<div/>',
				message: 'The "div" element is not allowed in the "ul" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4231-006] a slot wrapper that stands for a component accepts what it is given', async () => {
		const { violations } = await mlRuleTest(rule, '<MyList><div/></MyList>', {
			...jsxConfig,
			pretenders: [{ selector: 'MyList', as: { element: 'div', slots: [{ element: 'Tooltip' }] } }],
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4231-007] a pretender that stands for an HTML element is still checked as that element', async () => {
		const { violations } = await mlRuleTest(rule, '<p><MyTabs/></p>', {
			...jsxConfig,
			pretenders: [{ selector: 'MyTabs', as: 'div' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				raw: '<MyTabs/>',
				message: 'The "div" element is not allowed in the "p" element in this context',
			},
		]);
	});
});

describe('the style element where flow content is expected', () => {
	test('[permitted-contents-issue-4475-001] flow content accepts a style element as the first child of its parent', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<div>
	<!-- comment -->
	<style>
		p {
			color: red;
		}
	</style>
	<p>text</p>
</div>`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-002] flow content rejects a style element that follows an element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<main>
	<p>text</p>
	<style>
		p {
			color: blue;
		}
	</style>
</main>`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 3,
				col: 2,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "main" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-003] flow content rejects a style element that follows non-whitespace text', async () => {
		const { violations } = await mlRuleTest(rule, '<div>text<style></style></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "div" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-004] the first-child condition does not reject other flow content that follows text', async () => {
		const { violations } = await mlRuleTest(rule, '<div>text<p>text</p><span>text</span></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-005] phrasing content still rejects a style element as the first child', async () => {
		const { violations } = await mlRuleTest(rule, '<p><style></style>text</p>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 4,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "p" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-006] flow content rejects a style element that follows a no-break space, which is not inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<div>\u00A0<style></style></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "div" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-007] the transparent model rejects a style element that is not the first child of its parent', async () => {
		const { violations } = await mlRuleTest(rule, '<div><noscript><p></p><style></style></noscript></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 23,
				raw: '<style>',
				message:
					'The "style" element is not allowed in the "div" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-008] a Nunjucks expression before a style element does not count, as its output is known only at run time', async () => {
		const { violations } = await mlRuleTest(rule, '<div>{{ a }}<style></style></div>', {
			parser: { '.*': '@markuplint/nunjucks-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-009] a PHP echo before a style element does not count, as its output is known only at run time', async () => {
		const { violations } = await mlRuleTest(rule, '<div><?php echo $a; ?><style></style></div>', {
			parser: { '.*': '@markuplint/php-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-010] an element inside a conditional block before a style element precedes it, as the content of the block is taken as present', async () => {
		const { violations } = await mlRuleTest(rule, '<div>{% if a %}<p></p>{% endif %}<style></style></div>', {
			parser: { '.*': '@markuplint/nunjucks-parser' },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 34,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "div" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-011] an EJS output tag before a style element does not count, as its output is known only at run time', async () => {
		const { violations } = await mlRuleTest(rule, '<div><%= a %><style></style></div>', {
			parser: { '.*': '@markuplint/ejs-parser' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-012] CRLF before a style element is inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<div>\r\n<style></style>\r\n<p>text</p>\r\n</div>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-013] body accepts a style element as its first child', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>t</title></head><body>\n<style></style>\n<h1>text</h1></body></html>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-014] body rejects a style element that follows an element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>t</title></head><body><h1>text</h1><style></style></body></html>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 55,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "body" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-015] the transparent model accepts a style element that is the first child of the transparent element, whose content model is derived from its parent', async () => {
		const { violations } = await mlRuleTest(rule, '<div><p></p><noscript><style></style></noscript></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-016] :first-child written in a custom content model keeps the Selectors definition', async () => {
		const { violations } = await mlRuleTest(rule, '<x-box>text<span></span></x-box>', {
			rule: [
				{
					tag: 'x-box',
					contents: [{ zeroOrMore: '#text' }, { optional: 'span:first-child' }],
				},
			],
		});
		expect(violations).toStrictEqual([]);
		const { violations: afterElement } = await mlRuleTest(rule, '<x-box><b></b><span></span></x-box>', {
			rule: [
				{
					tag: 'x-box',
					contents: [{ zeroOrMore: 'b' }, { optional: 'span:first-child' }],
				},
			],
		});
		expect(afterElement).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				raw: '<span>',
				message: 'The "span" element is not allowed in the "x-box" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-017] a hexadecimal character reference to a space before a style element is inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<div>&#x20;<style></style></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-018] a named character reference to a tab before a style element is inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<div>&Tab;<style></style></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-019] a decimal character reference to a line feed without a semicolon before a style element is inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<div>&#10<style></style></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4475-020] the transparent model rejects a style element after non-whitespace text in the transparent element', async () => {
		const { violations } = await mlRuleTest(rule, '<div><noscript>\u00A0<style></style></noscript></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<style>',
				message:
					'The "style" element is not allowed in the "div" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-021] an empty transparent element before a style element precedes it', async () => {
		const { violations } = await mlRuleTest(rule, '<div><noscript></noscript><style></style></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "div" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-022] only the first of two style elements is accepted', async () => {
		const { violations } = await mlRuleTest(rule, '<div><style></style><style></style></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "div" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-023] a style element after the summary of a details element is rejected', async () => {
		const { violations } = await mlRuleTest(rule, '<details><summary>s</summary><style></style></details>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 30,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "details" element in this context',
			},
		]);
	});

	test('[permitted-contents-issue-4475-024] a style element inside a conditional block after an element is rejected', async () => {
		const { violations } = await mlRuleTest(rule, '<div><p></p>{% if a %}<style></style>{% endif %}</div>', {
			parser: { '.*': '@markuplint/nunjucks-parser' },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 23,
				raw: '<style>',
				message: 'The "style" element is not allowed in the "div" element in this context',
			},
		]);
	});
});

describe('the address element', () => {
	test('[permitted-contents-invalid-035] address rejects a footer descendant', async () => {
		const { violations } = await mlRuleTest(rule, '<address><footer>text</footer></address>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				raw: '<footer>',
				message: 'The "footer" element is not allowed in the "address" element in this context',
			},
		]);
	});
});

describe('nested transparent elements', () => {
	test('[permitted-contents-invalid-036] the content of a transparent element inside another is checked against the outer parent', async () => {
		const { violations } = await mlRuleTest(rule, '<span><ins><ins><div></div></ins></ins></span>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 17,
				raw: '<div>',
				message:
					'The "div" element is not allowed in the "span" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-invalid-037] a style element after an element inside nested transparent elements is rejected', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><ins><noscript><p></p><style></style></noscript></ins></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 28,
				raw: '<style>',
				message:
					'The "style" element is not allowed in the "div" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-valid-004] phrasing content inside nested transparent elements is accepted in phrasing content', async () => {
		const { violations } = await mlRuleTest(rule, '<span><ins><ins><b>text</b></ins></ins></span>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-invalid-038] flow content inside a transparent element inside a link inside phrasing content is reported once', async () => {
		const { violations } = await mlRuleTest(rule, '<span><a href="#"><ins><div></div></ins></a></span>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 24,
				raw: '<div>',
				message:
					'The "div" element is not allowed in the "span" element through the transparent model in this context',
			},
		]);
	});

	test('[permitted-contents-invalid-039] a link rejects interactive content inside a transparent element inside it', async () => {
		const { violations } = await mlRuleTest(rule, '<p><a href="#"><ins><button></button></ins></a></p>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 21,
				raw: '<button>',
				message:
					'The "a" element is a transparent model but also disallows the "button" element in this context',
			},
		]);
	});
});

describe('inter-element whitespace', () => {
	test('[permitted-contents-valid-005] a character reference to ASCII whitespace is inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<ul>&#x20;<li></li>&#10;</ul>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-invalid-040] a no-break space is text, not inter-element whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<ul>\u00A0<li></li></ul>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 5,
				message: 'The text node is not allowed in the "ul" element in this context',
				raw: '\u00A0',
			},
		]);
	});

	test('[permitted-contents-valid-006] a no-break space is text that the title element accepts', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><title>\u00A0</title></head><body></body></html>');
		expect(violations).toStrictEqual([]);
	});
});

/**
 * @see https://html.spec.whatwg.org/multipage/dom.html#content-models
 * > Inter-element whitespace, comment nodes, and processing instruction nodes must be ignored when establishing whether an element's contents match the element's content model or not
 */
describe('comment nodes are ignored', () => {
	const HEAD = '<head><title>t</title></head>';
	const conditional = { rule: { options: { evaluateConditionalChildNodes: true } } };

	test('[permitted-contents-issue-4488-001] a comment before the head element', async () => {
		const { violations } = await mlRuleTest(rule, `<html><!-- c -->${HEAD}<body></body></html>`);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-002] a comment between the head and the body elements', async () => {
		const { violations } = await mlRuleTest(rule, `<html>${HEAD}<!-- c --><body></body></html>`);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-003] a comment after the body element', async () => {
		const { violations } = await mlRuleTest(rule, `<html>${HEAD}<body></body><!-- c --></html>`);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-004] a comment before the summary element', async () => {
		const { violations } = await mlRuleTest(rule, '<details><!-- c --><summary>s</summary>x</details>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-005] a comment before the figcaption element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<figure><!-- c --><img src="a" alt=""><figcaption>c</figcaption></figure>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-006] comments with evaluateConditionalChildNodes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<html><!-- c -->${HEAD}<!-- c --><body></body><!-- c --></html>`,
			conditional,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-007] a comment does not take the place of a required element', async () => {
		const { violations } = await mlRuleTest(rule, '<hgroup><!-- c --></hgroup>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<hgroup>',
				message: 'Require an element. (Need "h6")',
			},
		]);
	});

	test('[permitted-contents-issue-4488-008] a comment after the figcaption element inside a transparent element', async () => {
		const { violations } = await mlRuleTest(rule, '<figure><a><figcaption></figcaption><!-- c --></a></figure>');
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-009] a comment inside a transparent element with evaluateConditionalChildNodes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<figure><a><figcaption></figcaption><!-- c --></a></figure>',
			conditional,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-010] a comment before the content of a transparent element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<figure><ins><!-- c --><img src="a" alt=""></ins><figcaption>c</figcaption></figure>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4488-011] the message of a violation is translated into Japanese', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<html>${HEAD}<body></body><body></body></html>`,
			{ rule: true, parser: { '.*': '@markuplint/svelte-parser' } },
			false,
			'ja',
		);
		expect(violations.map(v => v.message)).toStrictEqual([
			'必要以上のコンテンツがあります。必要な要素数の最大は1です',
		]);
	});
});

// A framework judges a `<style>` by what it outputs: Vue removes it from a template, Svelte outputs a nested
// one as is, and React moves one that has `href` and `precedence` to the `<head>`.
describe('the style element and the frameworks that do not output it where it is written', () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' } };
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
	const react = { ...jsx, specs: { '.*': '@markuplint/react-spec' } };
	const react18 = { ...jsx, specs: { '.*': '@markuplint/react-spec/react-18' } };

	const notAllowed = (name: string, parent: string, line: number, col: number, raw: string) => ({
		severity: 'error',
		line,
		col,
		message: `The "${name}" element is not allowed in the "${parent}" element in this context`,
		raw,
	});

	test('[permitted-contents-issue-4484-001] Vue removes a style element of the template, so where it is written is not checked', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><p></p><style></style></div></template>', vue);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4484-002] Vue: a style element in a list is not checked, and the other elements still are', async () => {
		expect(
			(await mlRuleTest(rule, '<template><ul><style></style><li></li></ul></template>', vue)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<template><ul><style></style><div></div></ul></template>', vue)).violations,
		).toStrictEqual([notAllowed('div', 'ul', 1, 30, '<div>')]);
	});

	test('[permitted-contents-issue-4484-003] Vue removes a script element of the template as well', async () => {
		const { violations } = await mlRuleTest(rule, '<template><p>text<script></script></p></template>', vue);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4484-004] Svelte outputs a nested style element as is, so it is checked like any element', async () => {
		const { violations } = await mlRuleTest(rule, '<div><p></p><style></style></div>', svelte);
		expect(violations).toStrictEqual([notAllowed('style', 'div', 1, 13, '<style>')]);
	});

	test('[permitted-contents-issue-4484-005] Svelte: a nested style element that comes first is accepted', async () => {
		const { violations } = await mlRuleTest(rule, '<div><style></style><p></p></div>', svelte);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4484-006] Svelte: the top-level style element is the CSS of the component, so it is not checked', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><p></p></div>\n<style lang="scss">// c\n$c: red;</style>',
			svelte,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4484-007] React moves a style element that has href and precedence, so where it is written is not checked', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><p></p><style href="a" precedence="b"></style></div>',
			react,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4484-008] React does not move a style element without href and precedence', async () => {
		expect((await mlRuleTest(rule, '<div><p></p><style></style></div>', react)).violations).toStrictEqual([
			notAllowed('style', 'div', 1, 13, '<style>'),
		]);
		expect((await mlRuleTest(rule, '<div><p></p><style href="a"></style></div>', react)).violations).toStrictEqual([
			notAllowed('style', 'div', 1, 13, '<style href="a">'),
		]);
	});

	test('[permitted-contents-issue-4484-009] the parser alone does not decide it: without the spec of React the element is checked', async () => {
		const { violations } = await mlRuleTest(rule, '<div><p></p><style href="a" precedence="b"></style></div>', jsx);
		expect(violations).toStrictEqual([notAllowed('style', 'div', 1, 13, '<style href="a" precedence="b">')]);
	});

	test('[permitted-contents-issue-4484-010] React moves a title element', async () => {
		expect((await mlRuleTest(rule, '<div><p></p><title>t</title></div>', react)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<div><p></p><title>t</title></div>', jsx)).violations).toStrictEqual([
			notAllowed('title', 'div', 1, 13, '<title>'),
		]);
	});

	test('[permitted-contents-issue-4484-011] React moves a meta element, except one that has itemProp', async () => {
		expect((await mlRuleTest(rule, '<ul><meta name="a" content="b" /></ul>', react)).violations).toStrictEqual([]);
		expect((await mlRuleTest(rule, '<ul><meta itemProp="a" content="b" /></ul>', react)).violations).toStrictEqual([
			notAllowed('meta', 'ul', 1, 5, '<meta itemProp="a" content="b" />'),
		]);
	});

	test('[permitted-contents-issue-4484-012] React moves a link element, except one that it does not manage', async () => {
		expect((await mlRuleTest(rule, '<ul><link rel="icon" href="x" /></ul>', react)).violations).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<ul><link rel="stylesheet" href="x" precedence="d" /></ul>', react)).violations,
		).toStrictEqual([]);
		// A stylesheet without `precedence` is not moved
		expect((await mlRuleTest(rule, '<ul><link rel="stylesheet" href="x" /></ul>', react)).violations).toStrictEqual(
			[notAllowed('link', 'ul', 1, 5, '<link rel="stylesheet" href="x" />')],
		);
		// `onLoad`, `onError`, `itemProp` and (of a stylesheet) `disabled` mean that the component manages it
		expect(
			(await mlRuleTest(rule, '<ul><link rel="icon" href="x" onLoad={f} /></ul>', react)).violations,
		).toStrictEqual([notAllowed('link', 'ul', 1, 5, '<link rel="icon" href="x" onLoad={f} />')]);
		expect(
			(await mlRuleTest(rule, '<ul><link rel="icon" href="x" onError={f} /></ul>', react)).violations,
		).toStrictEqual([notAllowed('link', 'ul', 1, 5, '<link rel="icon" href="x" onError={f} />')]);
		expect(
			(await mlRuleTest(rule, '<ul><link itemProp="author" href="x" /></ul>', react)).violations,
		).toStrictEqual([notAllowed('link', 'ul', 1, 5, '<link itemProp="author" href="x" />')]);
		expect(
			(await mlRuleTest(rule, '<ul><link rel="stylesheet" href="x" precedence="d" disabled /></ul>', react))
				.violations,
		).toStrictEqual([notAllowed('link', 'ul', 1, 5, '<link rel="stylesheet" href="x" precedence="d" disabled />')]);
	});

	test('[permitted-contents-issue-4484-013] the element that React moves is counted in the head, where it is placed', async () => {
		expect(
			(await mlRuleTest(rule, '<html><head><title>t</title></head><body></body></html>', react)).violations,
		).toStrictEqual([]);
		// `head` requires a title: without one it is still reported
		expect(
			(await mlRuleTest(rule, '<html><head><meta charSet="utf-8" /></head><body></body></html>', react))
				.violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'Require an element. (Need "title")',
				raw: '<head>',
			},
		]);
	});

	test('[permitted-contents-issue-4484-014] the spec for a React that outputs elements where they are written checks them', async () => {
		expect((await mlRuleTest(rule, '<div><p></p><title>t</title></div>', react18)).violations).toStrictEqual([
			notAllowed('title', 'div', 1, 13, '<title>'),
		]);
		expect(
			(await mlRuleTest(rule, '<div><p></p><style href="a" precedence="b"></style></div>', react18)).violations,
		).toStrictEqual([notAllowed('style', 'div', 1, 13, '<style href="a" precedence="b">')]);
	});

	// `isHostHoistableType` of `react-dom-bindings`: "Global opt out of hoisting for anything in SVG
	// Namespace or anything with an itemProp", and a `<link>` or a `<style>` needs a non-empty `href`
	test('[permitted-contents-issue-4484-015] React does not move an element that has itemProp, a title and a style as well', async () => {
		expect((await mlRuleTest(rule, '<div><title itemProp="x">t</title></div>', react)).violations).toStrictEqual([
			notAllowed('title', 'div', 1, 6, '<title itemProp="x">'),
		]);
		expect(
			(await mlRuleTest(rule, '<div><p></p><style href="a" precedence="b" itemProp="x"></style></div>', react))
				.violations,
		).toStrictEqual([notAllowed('style', 'div', 1, 13, '<style href="a" precedence="b" itemProp="x">')]);
	});

	test('[permitted-contents-issue-4484-016] React does not move a link element that has no href or an empty one', async () => {
		expect((await mlRuleTest(rule, '<ul><link rel="icon" /></ul>', react)).violations).toStrictEqual([
			notAllowed('link', 'ul', 1, 5, '<link rel="icon" />'),
		]);
		expect((await mlRuleTest(rule, '<ul><link rel="icon" href="" /></ul>', react)).violations).toStrictEqual([
			notAllowed('link', 'ul', 1, 5, '<link rel="icon" href="" />'),
		]);
		expect((await mlRuleTest(rule, '<ul><link href="x" /></ul>', react)).violations).toStrictEqual([
			notAllowed('link', 'ul', 1, 5, '<link href="x" />'),
		]);
		expect(
			(await mlRuleTest(rule, '<ul><link rel="stylesheet" href="" precedence="d" /></ul>', react)).violations,
		).toStrictEqual([notAllowed('link', 'ul', 1, 5, '<link rel="stylesheet" href="" precedence="d" />')]);
	});

	test('[permitted-contents-issue-4484-017] React does not move a stylesheet that has onLoad or onError either', async () => {
		expect(
			(await mlRuleTest(rule, '<ul><link rel="stylesheet" href="x" precedence="d" onLoad={f} /></ul>', react))
				.violations,
		).toStrictEqual([
			notAllowed('link', 'ul', 1, 5, '<link rel="stylesheet" href="x" precedence="d" onLoad={f} />'),
		]);
		expect(
			(await mlRuleTest(rule, '<ul><link rel="stylesheet" href="x" precedence="d" onError={f} /></ul>', react))
				.violations,
		).toStrictEqual([
			notAllowed('link', 'ul', 1, 5, '<link rel="stylesheet" href="x" precedence="d" onError={f} />'),
		]);
	});

	test('[permitted-contents-issue-4484-018] React moves an element whose attributes are expressions', async () => {
		// An expression is a value that is not known, which the selector takes as present
		expect((await mlRuleTest(rule, '<ul><link rel={r} href={u} /></ul>', react)).violations).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<ul><link rel="stylesheet" href={u} precedence={p} /></ul>', react)).violations,
		).toStrictEqual([]);
		expect(
			(await mlRuleTest(rule, '<div><p></p><style href={u} precedence={p}></style></div>', react)).violations,
		).toStrictEqual([]);
	});

	test('[permitted-contents-issue-4484-019] React does not move a style element that has an empty href', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><p></p><style href="" precedence="b"></style></div>',
			react,
		);
		expect(violations).toStrictEqual([notAllowed('style', 'div', 1, 13, '<style href="" precedence="b">')]);
	});

	test('[permitted-contents-issue-4484-020] an SVG title element is not what React moves', async () => {
		// `switch` of SVG does not accept a title, and React moves only an element of the HTML namespace
		const { violations } = await mlRuleTest(rule, '<svg><switch><title>a</title></switch></svg>', react);
		expect(violations).toStrictEqual([notAllowed('title', 'switch', 1, 14, '<title>')]);
	});

	test('[permitted-contents-issue-4484-021] a fragment component in the head contributes its children to the head, where they are counted', async () => {
		const wrap = {
			selector: 'Wrap',
			as: { element: '#fragment', slots: true, contents: [{ slot: true }] },
		} as const;
		const config = { ...react, pretenders: [wrap] };
		expect(
			(await mlRuleTest(rule, '<html><head><Wrap><title>t</title></Wrap></head><body></body></html>', config))
				.violations,
		).toStrictEqual([]);
		// Elsewhere what the fragment contributes is moved as if it were written in the parent
		expect(
			(await mlRuleTest(rule, '<div><p></p><Wrap><title>t</title></Wrap></div>', config)).violations,
		).toStrictEqual([]);
	});
});
