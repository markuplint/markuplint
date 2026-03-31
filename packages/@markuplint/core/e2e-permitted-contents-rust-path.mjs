/**
 * E2E test for permitted-contents using the full Rust path.
 *
 * Same assertions as e2e-permitted-contents.mjs, but uses lintHtml()
 * (Rust HTML parser → Rust DOM → Rust rules) instead of
 * TS html-parser → MLAST JSON → Rust lint().
 */
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { lintHtml } = require_('./index.cjs');
const htmlSpec = require_('@markuplint/html-spec');
const specJson = JSON.stringify(htmlSpec);

function lintHtmlRust(html) {
	return lintHtml(html, JSON.stringify({ rules: { 'permitted-contents': true } }), specJson);
}
function pc(v) {
	return v.filter(x => x.ruleId === 'permitted-contents');
}

/* eslint-disable no-console, unicorn/no-process-exit, @typescript-eslint/no-unused-vars */
let pass = 0,
	fail = 0,
	skip = 0;
const failures = [];
function test(name, fn) {
	try {
		const ok = fn();
		if (ok) {
			pass++;
		} else {
			fail++;
			failures.push(name);
			console.log('FAIL', name);
		}
	} catch (error) {
		fail++;
		failures.push(name);
		console.log('FAIL', name, error.message?.slice(0, 120));
	}
}
function skipTest(name, reason) {
	skip++;
}

// ============================================================
// describe('verify') — HTML-only tests from index.spec.ts
// ============================================================

// --- a (transparent model) ---
test('a:1 flow content valid', () => pc(lintHtmlRust('<a><div></div><span></span><em></em></a>')).length === 0);
test('a:2 heading valid', () => pc(lintHtmlRust('<a><h1></h1></a>')).length === 0);
test('a:3 option in div>a invalid (transparent leaks to parent)', () => {
	const v = pc(lintHtmlRust('<div><a><option></option></a></div>'));
	return v.length === 1 && v[0].message.includes('option') && v[0].message.includes('through the transparent model');
});
test('a:4 button invalid (interactive)', () => {
	const v = pc(lintHtmlRust('<a><button></button></a>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('button');
});
test('a:5 deep nested button invalid', () => {
	const v = pc(lintHtmlRust('<a><div><div><button></button></div></div></a>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('button');
});
test('a:6 div in span through transparent invalid', () => {
	const v = pc(lintHtmlRust('<span><a><div></div></a></span>'));
	return v.length === 1 && v[0].message.includes('through the transparent model');
});
test('a:7 text valid', () => pc(lintHtmlRust('<a>text</a>')).length === 0);
test('a:8 div>a deep nested button invalid', () => {
	const v = pc(lintHtmlRust('<div><a><div><div><button></button></div></div></a></div>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('button');
});

// --- address ---
test('address:1 nested address invalid', () => {
	const v = pc(lintHtmlRust('<address><address></address></address>'));
	return v.length === 1;
});
test('address:2 deeply nested address invalid', () => {
	const v = pc(lintHtmlRust('<address><div><div><div><address></address></div></div></div></address>'));
	return v.length === 1 && (v[0].message.includes('address') || v[0].message.includes('div'));
});

// --- audio (transparent) ---
test('audio:1 source in div through transparent invalid (src attr)', () => {
	const v = pc(lintHtmlRust('<div><audio src="path/to"><source></audio></div>'));
	return v.length === 1 && v[0].message.includes('source') && v[0].message.includes('through the transparent model');
});
test('audio:2 source+div valid (no src attr)', () =>
	pc(lintHtmlRust('<div><audio><source><div></div></audio></div>')).length === 0);
test('audio:3 source only valid (no src attr)', () =>
	pc(lintHtmlRust('<div><audio><source></audio></div>')).length === 0);
// --- interactive content conditional matching ---
test('audio without controls in a valid', () => pc(lintHtmlRust('<a href="#"><audio></audio></a>')).length === 0);
test('audio[controls] in a invalid', () => {
	const v = pc(lintHtmlRust('<a href="#"><audio controls></audio></a>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('audio');
});
test('video without controls in a valid', () => pc(lintHtmlRust('<a href="#"><video></video></a>')).length === 0);
test('video[controls] in a invalid', () => {
	const v = pc(lintHtmlRust('<a href="#"><video controls></video></a>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('video');
});

test('audio:4 nested audio invalid', () => {
	const v = pc(lintHtmlRust('<audio><audio></audio></audio>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('audio');
});
test('audio:5 nested audio in div invalid', () => {
	const v = pc(lintHtmlRust('<div><audio><audio></audio></audio></div>'));
	return v.length === 1 && v[0].message.includes('disallows') && v[0].message.includes('audio');
});

// --- dl ---
test('dl:1 dt+dd valid', () => pc(lintHtmlRust('<dl><dt></dt><dd></dd></dl>')).length === 0);
test('dl:2 dt+dd+div mixed invalid', () => {
	const v = pc(
		lintHtmlRust(`<dl>
				<dt></dt>
				<dd></dd>
				<div></div>
			</dl>`),
	);
	return v.length === 2;
});
test('dl:3 dt+div+dd+div mixed invalid', () => {
	const v = pc(
		lintHtmlRust(`<dl>
				<dt></dt>
				<div></div>
				<dd></dd>
				<div></div>
			</dl>`),
	);
	return v.length === 3;
});
test('dl:4 all divs', () => {
	const v = pc(
		lintHtmlRust(`<dl>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</dl>`),
	);
	return v.length === 4;
});
test('dl:5 div>dt+dd valid', () => pc(lintHtmlRust('<dl><div><dt></dt><dd></dd></div></dl>')).length === 0);
test('dl:6 dt+dd in div (not dl child) invalid', () => {
	const v = pc(
		lintHtmlRust(`<div>
				<dt></dt>
				<dd></dd>
			</div>`),
	);
	return v.length === 1 && v[0].message.includes('dt');
});
test('dl:7 div>span in dl invalid', () => {
	const v = pc(
		lintHtmlRust(`<dl>
				<div>
					<span></span>
				</div>
			</dl>`),
	);
	return v.length === 1;
});

// --- table ---
test('table:1 thead+tr valid', () => {
	return (
		pc(
			lintHtmlRust(`<table>
			<thead></thead>
			<tr>
				<td>cell</td>
			</tr>
		</table>`),
		).length === 0
	);
});
test('table:2 tbody+thead order invalid', () => {
	const v = pc(
		lintHtmlRust(`<table>
			<tbody>
				<tr>
					<td>cell</td>
				</tr>
			</tbody>
			<thead></thead>
		</table>`),
	);
	return v.length === 1 && v[0].message.includes('thead');
});

// --- ruby ---
test('ruby:1 rp+rt valid', () => {
	return (
		pc(
			lintHtmlRust(`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
			<rp>)</rp>
		</ruby>`),
		).length === 0
	);
});
test('ruby:2 missing rp invalid', () => {
	return (
		pc(
			lintHtmlRust(`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
		</ruby>`),
		).length > 0
	);
});
test('ruby:3 complex multi-rt valid', () => {
	return (
		pc(
			lintHtmlRust(
				// cspell:disable-next-line
				'<ruby>♥ <rt> Heart <rt lang=fr> Cœur </rt>☘ <rt> Shamrock <rt lang=fr> Trèfle </rt>✶ <rt> Star <rt lang=fr> Étoile </rt></ruby>',
			),
		).length === 0
	);
});

// --- ul ---
test('ul:1 div invalid', () => {
	const v = pc(lintHtmlRust('<ul><div></div></ul>'));
	return v.length === 1 && v[0].message.includes('div');
});
test('ul:2 text invalid', () => {
	const v = pc(lintHtmlRust('<ul>TEXT</ul>'));
	return v.length === 1 && v[0].message.includes('text node');
});
test('ul:3 li valid', () => pc(lintHtmlRust('<ul><li></li></ul>')).length === 0);
test('ul:4 multiple li valid', () => pc(lintHtmlRust('<ul><li></li><li></li><li></li></ul>')).length === 0);

// --- meta ---
test('meta:1 meta without itemprop in li invalid', () => {
	const v = pc(
		lintHtmlRust(`<ol>
				<li>
					<span>Award winners</span>
					<meta content="3" />
				</li>
			</ol>`),
	);
	return v.length === 1 && v[0].message.includes('meta');
});
test('meta:2 meta with itemprop in li valid', () => {
	return (
		pc(
			lintHtmlRust(`<ol itemscope itemtype="https://schema.org/BreadcrumbList">
				<li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
					<a itemprop="item" href="https://example.com/books">
						<span itemprop="name">Books</span>
					</a>
					<meta itemprop="position" content="1" />
				</li>
			</ol>`),
		).length === 0
	);
});

// --- hgroup ---
test('hgroup:1 h1 valid', () => pc(lintHtmlRust('<hgroup><h1>Heading</h1></hgroup>')).length === 0);
test('hgroup:2 h1+h2+h2 two extra h2 invalid', () => {
	const v = pc(
		lintHtmlRust(`<hgroup>
				<h1>Heading</h1>
				<h2>Sub</h2>
				<h2>Sub2</h2>
			</hgroup>`),
	);
	return v.length === 1 && v[0].message.includes('h2');
});
test('hgroup:3 template+h1+template+h2+template invalid', () => {
	const v = pc(
		lintHtmlRust(`<hgroup>
				<template></template>
				<h1>Heading</h1>
				<template></template>
				<h2>Sub</h2>
				<template></template>
				<h2>Sub2</h2>
				<template></template>
			</hgroup>`),
	);
	return v.length > 0;
});
test('hgroup:4 template only invalid', () => {
	const v = pc(
		lintHtmlRust(`<hgroup>
				<template></template>
			</hgroup>`),
	);
	return v.length === 1;
});

// --- select ---
test('select:1 empty valid', () => pc(lintHtmlRust('<select></select>')).length === 0);
test('select:2 option valid', () => pc(lintHtmlRust('<select><option>1</option></select>')).length === 0);
test('select:3 multiple options valid', () =>
	pc(lintHtmlRust('<select><option>1</option><option>2</option><option>3</option></select>')).length === 0);
test('select:4 optgroup valid', () => pc(lintHtmlRust('<select><optgroup></optgroup></select>')).length === 0);
test('select:5 optgroup>option valid', () =>
	pc(lintHtmlRust('<select><optgroup><option>1</option></optgroup></select>')).length === 0);
test('select:6 optgroup>multiple options valid', () =>
	pc(lintHtmlRust('<select><optgroup><option>1</option><option>2</option><option>3</option></optgroup></select>'))
		.length === 0);
test('select:7 div parse error (crash safety)', () => {
	// Rust parser handles parse errors without circular refs — verify no crash/panic
	pc(lintHtmlRust('<select>\n\t\t\t\t<div><!-- Parse Error --></div>\n\t\t\t</select>'));
	return true;
});
test('select:8 optgroup>div parse error (crash safety)', () => {
	pc(
		lintHtmlRust(
			'<select>\n\t\t\t\t<optgroup>\n\t\t\t\t\t<div><!-- Parse Error --></div>\n\t\t\t\t</optgroup>\n\t\t\t</select>',
		),
	);
	return true;
});

// --- script/style ---
test('script: text valid', () => pc(lintHtmlRust('<script>alert("checking");</script>')).length === 0);
test('style: text valid', () => pc(lintHtmlRust('<style>#id { prop: value; }</style>')).length === 0);

// --- Multiple ---
test('Multiple: body with a>button and audio>source', () => {
	const v = pc(
		lintHtmlRust(`<!DOCTYPE html><html><head><title>T</title></head><body>
	<a href="001.html">
		<div>
			<button></button>
		</div>
	</a>
	<audio src="path/to">
		<source src="path/to" />
	</audio>
</body></html>`),
	);
	return v.length === 2;
});

// --- Dep exp named capture ---
test('figure: img+figcaption valid', () => pc(lintHtmlRust('<figure><img><figcaption></figure>')).length === 0);

// --- Custom element ---
test('custom element in div valid', () => pc(lintHtmlRust('<div><x-item></x-item></div>')).length === 0);

// --- SVG ---
test('svg:a text valid', () => pc(lintHtmlRust('<svg><a><text>text</text></a></svg>')).length === 0);
test('svg:a feBlend invalid', () => {
	const v = pc(lintHtmlRust('<svg><a><feBlend /></a></svg>'));
	return v.length === 1 && v[0].message.toLowerCase().includes('feblend');
});
test('svg:foreignObject div valid', () =>
	pc(lintHtmlRust('<svg><foreignObject><div>text</div></foreignObject></svg>')).length === 0);
test('svg:foreignObject rect valid', () => {
	return pc(lintHtmlRust('<svg><foreignObject><rect /></foreignObject></svg>')).length === 0;
});
test('svg:foreignObject div>rect invalid', () => {
	const v = pc(lintHtmlRust('<svg><foreignObject><div><rect /></div></foreignObject></svg>'));
	return v.length === 1 && v[0].message.includes('rect');
});
test('Interactive Element in SVG: video invalid', () => {
	const v = pc(lintHtmlRust('<svg><video></video></svg>'));
	return v.length === 1 && v[0].message.includes('video');
});

// --- MathML ---
test('mml:mfrac 2 children valid', () =>
	pc(lintHtmlRust('<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>')).length === 0);
test('mml:mfrac 3 children invalid', () =>
	pc(lintHtmlRust('<math><mfrac><mi>a</mi><mi>b</mi><mi>c</mi></mfrac></math>')).length > 0);
test('mml:math presentation elements valid', () =>
	pc(lintHtmlRust('<math><mi>x</mi><mo>+</mo><mn>1</mn></math>')).length === 0);

// --- SVG image ---
test('svg image valid', () =>
	pc(lintHtmlRust('<svg><g><image width="100" height="100" xlink:href="path/to"/></g></svg>')).length === 0);
// Rust WHATWG parser converts <image> to <img> (per spec §13.2.6.4.7),
// so <img> is valid phrasing content inside <span> — no violation expected.
test('html image in span valid (Rust: image→img)', () => {
	const v = pc(lintHtmlRust('<div><span><image width="100" height="100" xlink:href="path/to"/></span></div>'));
	return v.length === 0;
});

// --- Custom element with rule config ---
skipTest('Custom element with config', 'requires rule config option which is not supported in Rust lint() yet');

// --- special content models ---
test('script: mixed content valid', () =>
	pc(lintHtmlRust('<script><style></style><div></div><li></li><script></script></script>')).length === 0);
test('style: mixed content valid', () =>
	pc(lintHtmlRust('<style><style></style><div></div><li></li><style></style></style>')).length === 0);
test('noscript: nested noscript invalid', () => {
	const v = pc(
		lintHtmlRust(`<noscript>
						<style></style>
						<div></div>
						<li></li>
						<noscript></noscript>
					</noscript>`),
	);
	return v.length === 1 && v[0].message.includes('noscript') && v[0].message.includes('disallows');
});
test('iframe: disallows contents', () => {
	const v = pc(
		lintHtmlRust(`<iframe>
						<style></style>
						<div></div>
						<li></li>
						<iframe></iframe>
					</iframe>`),
	);
	return v.length === 1 && v[0].message === 'The element disallows contents';
});

// ============================================================
// describe('React') — SKIP (requires JSX parser)
// ============================================================
skipTest('React: case-sensitive', 'requires JSX parser');
skipTest('React: Components', 'requires JSX parser');
skipTest('React: Expect to contain a text node (JSX)', 'requires JSX parser');
skipTest('React: Element has only custom components', 'requires JSX parser');

// --- head/title text tests (HTML-only subset) ---
test('head: title with variable valid', () => pc(lintHtmlRust('<head><title>{variable}</title></head>')).length === 0);
test('head: title with newline valid', () => pc(lintHtmlRust('<head><title>\n</title></head>')).length === 0);

// ============================================================
// describe('Pretenders Option') — SKIP
// ============================================================
skipTest('Pretenders: Element', 'requires JSX parser + pretenders');
skipTest('Pretenders: Attr', 'requires JSX parser + pretenders');
skipTest('Pretenders: as attribute', 'requires JSX parser + pretenders');

// ============================================================
// describe('Vue/EJS/Conditional/Loop') — SKIP
// ============================================================
skipTest('Vue: Element has only custom components', 'requires Vue parser');
skipTest('EJS: PSBlock 1', 'requires EJS parser');
skipTest('EJS: PSBlock 2', 'requires EJS parser');
skipTest('Conditional: if details>summary', 'requires Svelte parser');
skipTest('Conditional: if a>button', 'requires Svelte parser');
skipTest('Conditional: each ul>li', 'requires Svelte parser');
skipTest('Loop: Svelte', 'requires Svelte parser');
skipTest('Loop: Vue', 'requires Vue parser');
skipTest('Loop: Pug', 'requires Pug parser');
skipTest('Loop: Alpine', 'requires Alpine parser');
skipTest('Loop: JSX', 'requires JSX parser');
skipTest('Loop: Astro', 'requires Astro parser');

// ============================================================
// describe('Issues') — HTML-only subset
// ============================================================
test('#396: two tbody valid', () => {
	return (
		pc(
			lintHtmlRust(`<table>
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
					</table>`),
		).length === 0
	);
});
test('#398: colgroup valid', () => {
	return (
		pc(
			lintHtmlRust(`<table>
						<colgroup></colgroup>
						<colgroup><col /></colgroup>
						<colgroup span="1"></colgroup>
						<tbody>
							<tr>
								<td></td>
								<td></td>
								<td></td>
							</tr>
						</tbody>
					</table>`),
		).length === 0
	);
});
test('#491: hgroup p invalid', () => pc(lintHtmlRust('<hgroup><p>HEADING</p></hgroup>')).length === 1);
test('#491: hgroup h1 valid', () => pc(lintHtmlRust('<hgroup><h1>HEADING</h1></hgroup>')).length === 0);
test('#491: hgroup h2 valid', () => pc(lintHtmlRust('<hgroup><h2>HEADING</h2></hgroup>')).length === 0);
test('#491: hgroup p+h1+p valid', () =>
	pc(lintHtmlRust('<hgroup><p>SUB</p><h1>HEADING</h1><p>SUB</p></hgroup>')).length === 0);
test('#566: hgroup h1+h2 invalid', () => {
	const v = pc(
		lintHtmlRust(`<hgroup>
						<h1></h1>
						<h2></h2>
					</hgroup>`),
	);
	return v.length === 1 && v[0].message.includes('h2');
});
test('#606: dl>template>dt+dd invalid', () => {
	const v = pc(
		lintHtmlRust(`<dl>
					<template>
						<dt></dt>
						<dd></dd>
					</template>
				</dl>`),
	);
	return v.length === 1;
});
test('#617: head>title+noscript>style valid', () => {
	return (
		pc(
			lintHtmlRust(`<head>
				<title>Title</title>
				<noscript>
					<style>
						.selector {}
					</style>
				</noscript></head>`),
		).length === 0
	);
});
test('#617: noscript>style standalone valid', () => {
	return (
		pc(
			lintHtmlRust(`<noscript>
					<style>
						.selector {}
					</style>
				</noscript>`),
		).length === 0
	);
});
test('#617: div>noscript>style invalid (style not flow)', () => {
	const v = pc(
		lintHtmlRust(`<div><noscript>
					<style>
						.selector {}
					</style>
				</noscript></div>`),
	);
	return v.length === 1 && v[0].message.includes('style') && v[0].message.includes('through the transparent model');
});
test('#617: span>noscript>div invalid (div not phrasing)', () => {
	const v = pc(
		lintHtmlRust(`<span><noscript>
					<div>
					</div>
				</noscript></span>`),
	);
	return v.length === 1 && v[0].message.includes('div') && v[0].message.includes('through the transparent model');
});
skipTest('#617: Pug noscript', 'requires Pug parser');

test('#637: ruby valid 1', () =>
	pc(lintHtmlRust('<ruby>漢<rp>（</rp><rt>かん</rt><rp>）</rp>字<rp>（</rp><rt>じ</rt><rp>）</rp></ruby>')).length ===
	0);
test('#637: ruby valid 2', () =>
	pc(lintHtmlRust('<ruby>A<rp></rp><rt></rt><rp></rp>B<rp></rp><rt></rt><rp></rp></ruby>')).length === 0);

skipTest('#1046: JSX severity override', 'requires JSX parser');
test('#1146: datalist option valid', () => pc(lintHtmlRust('<datalist><option></option></datalist>')).length === 0);

skipTest(
	'#1023: custom element with config',
	'requires per-element rule config option not yet supported in Rust lint()',
);

test('#1359: svg text>tspan valid', () => pc(lintHtmlRust('<svg><text><tspan>Text</tspan></text></svg>')).length === 0);

skipTest('#1451: multiple parsers', 'requires multiple framework parsers');
test('#1451: html span>div invalid', () => pc(lintHtmlRust('<span><div></div></span>')).length === 1);
test('#1451: html span>Div invalid (capitalized)', () => {
	const v = pc(lintHtmlRust('<span><Div></Div></span>'));
	return v.length === 1;
});

test('#1502: svg defs>filter>feTurbulence valid', () => {
	return (
		pc(
			lintHtmlRust(`<svg>
	<defs>
		<filter>
			<feTurbulence />
		</filter>
	</defs>
</svg>`),
		).length === 0
	);
});

skipTest('#1767: JSX fragments', 'requires JSX parser');
skipTest('#1848: JSX pretenders', 'requires JSX parser + pretenders');
skipTest('#2302: JSX SVG path', 'requires JSX parser');

test('#3249: many transparent siblings perf', () => {
	const anchors = Array.from({ length: 12 }, (_, i) => `<a><span>link${i}</span><em>text${i}</em></a>`).join('\n');
	const html = `<div>${anchors}</div>`;
	const start = Date.now();
	const v = pc(lintHtmlRust(html));
	const elapsed = Date.now() - start;
	return v.length === 0 && elapsed < 5000;
});

// ============================================================
// Additional edge cases
// ============================================================
test('details: summary+flow valid', () =>
	pc(lintHtmlRust('<details><summary>S</summary><p>Content</p></details>')).length === 0);
test('details: empty invalid', () => pc(lintHtmlRust('<details></details>')).length === 1);
test('head: title valid', () => pc(lintHtmlRust('<html><head><title>T</title></head></html>')).length === 0);
test('span: div invalid', () => pc(lintHtmlRust('<span><div></div></span>')).length > 0);

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Full Rust Path Result: ${pass} passed, ${fail} failed, ${skip} skipped ===`);
if (failures.length > 0) {
	console.log('Failures:');
	for (const f of failures) console.log(`  - ${f}`);
}
if (fail > 0) process.exit(1);
