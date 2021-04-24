import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

const ruleOn = {
	rules: {
		'permitted-contents': true,
	},
};

describe('verify', () => {
	test('a', async () => {
		await testAsyncAndSyncVerify('<a><div></div><span></span><em></em></a>', ruleOn, [rule], 'en');

		await testAsyncAndSyncVerify('<a><h1></h1></a>', ruleOn, [rule], 'en');

		await testAsyncAndSyncVerify('<div><a><option></option></a><div>', ruleOn, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);

		await testAsyncAndSyncVerify('<a><button></button></a>', ruleOn, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);

		await testAsyncAndSyncVerify('<a><div><div><button></button></div></div></a>', ruleOn, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<a>',
				message: 'Invalid content of the a element in the HTML specification',
			},
		]);

		await testAsyncAndSyncVerify('<span><a><div></div></a></span>', ruleOn, [rule], 'en', [
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
		await testAsyncAndSyncVerify('<address><address></address></address>', ruleOn, [rule], 'en', [
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
		await testAsyncAndSyncVerify('<div><audio src="path/to"><source></audio></div>', ruleOn, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<audio src="path/to">',
				message: 'Invalid content of the audio element in the HTML specification',
			},
		]);

		await testAsyncAndSyncVerify('<div><audio><source><div></div></audio></div>', ruleOn, [rule], 'en');

		await testAsyncAndSyncVerify('<div><audio><source></audio></div>', ruleOn, [rule], 'en');
	});

	test('dl', async () => {
		await testAsyncAndSyncVerify(
			`<dl>
				<dt></dt>
				<dd></dd>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);

		await testAsyncAndSyncVerify(
			`<dl>
				<dt></dt>
				<dd></dd>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
			[
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
			],
		);

		await testAsyncAndSyncVerify(
			`<dl>
				<dt></dt>
				<div></div>
				<dd></dd>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
			[
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
			],
		);

		await testAsyncAndSyncVerify(
			`<dl>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
			4,
			r => r.length,
		);

		await testAsyncAndSyncVerify(
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

		await testAsyncAndSyncVerify(
			`<div>
				<dt></dt>
				<dd></dd>
			</div>`,
			ruleOn,
			[rule],
			'en',
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 1,
					col: 1,
					raw: '<div>',
					message: 'Invalid content of the div element in the HTML specification',
				},
			],
		);

		await testAsyncAndSyncVerify(
			`<dl>
				<div>
					<span></span>
				</div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 2,
					col: 5,
					raw: '<div>',
					message: 'Invalid content of the div element in the HTML specification',
				},
			],
		);
	});

	test('table', async () => {
		await testAsyncAndSyncVerify(
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

		await testAsyncAndSyncVerify(
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
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 1,
					col: 1,
					raw: '<table>',
					message: 'Invalid content of the table element in the HTML specification',
				},
			],
		);
	});

	test('ruby', async () => {
		await testAsyncAndSyncVerify(
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

		await testAsyncAndSyncVerify(
			`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
		</ruby>`,
			ruleOn,
			[rule],
			'en',
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 1,
					col: 1,
					raw: '<ruby>',
					message: 'Invalid content of the ruby element in the HTML specification',
				},
			],
		);

		await testAsyncAndSyncVerify(
			`<ruby>
				♥ <rt> Heart <rt lang=fr> Cœur </rt>
				☘ <rt> Shamrock <rt lang=fr> Trèfle </rt>
				✶ <rt> Star <rt lang=fr> Étoile </rt>
			</ruby>`,
			ruleOn,
			[rule],
			'en',
		);
	});

	test('ul', async () => {
		await testAsyncAndSyncVerify('<ul><div></div></ul>', ruleOn, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<ul>',
				message: 'Invalid content of the ul element in the HTML specification',
			},
		]);

		await testAsyncAndSyncVerify('<ul><li></li></ul>', ruleOn, [rule], 'en');

		await testAsyncAndSyncVerify('<ul><li></li><li></li><li></li></ul>', ruleOn, [rule], 'en');
	});

	test('area', async () => {
		await testAsyncAndSyncVerify('<div><area></div>', ruleOn, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<area>',
				message: 'The area element must be descendant of the map element',
			},
		]);

		await testAsyncAndSyncVerify('<map><area></map>', ruleOn, [rule], 'en');

		await testAsyncAndSyncVerify('<map><div><area></div></map>', ruleOn, [rule], 'en');
	});

	test('meta', async () => {
		await testAsyncAndSyncVerify(
			`<ol>
				<li>
					<span>Award winners</span>
					<meta content="3" />
				</li>
			</ol>`,
			ruleOn,
			[rule],
			'en',
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 2,
					col: 5,
					raw: '<li>',
					message: 'Invalid content of the li element in the HTML specification',
				},
			],
		);

		await testAsyncAndSyncVerify(
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
	});

	test('hgroup', async () => {
		await testAsyncAndSyncVerify(
			`<hgroup>
				<h1>Heading</h1>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
		);

		await testAsyncAndSyncVerify(
			`<hgroup>
				<h1>Heading</h1>
				<h2>Sub</h2>
				<h2>Sub2</h2>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
		);

		await testAsyncAndSyncVerify(
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

		await testAsyncAndSyncVerify(
			`<hgroup>
				<template></template>
			</hgroup>`,
			ruleOn,
			[rule],
			'en',
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 1,
					col: 1,
					raw: '<hgroup>',
					message: 'Invalid content of the hgroup element in the HTML specification',
				},
			],
		);
	});

	test('script', async () => {
		await testAsyncAndSyncVerify(
			`<script>
				alert("checking");
			</script>`,
			ruleOn,
			[rule],
			'en',
		);
	});

	test('style', async () => {
		await testAsyncAndSyncVerify(
			`<style>
				#id {
					prop: value;
				}
			</style>`,
			ruleOn,
			[rule],
			'en',
		);
	});

	test('template', async () => {
		await testAsyncAndSyncVerify(
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

		await testAsyncAndSyncVerify(
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
			[
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
			],
		);
	});

	test('Dep exp named capture in interleave', async () => {
		await testAsyncAndSyncVerify('<figure><img><figcaption></figure>', ruleOn, [rule], 'en');
	});

	test('Custom element', async () => {
		await testAsyncAndSyncVerify('<div><x-item></x-item></div>', ruleOn, [rule], 'en');
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

		await testAsyncAndSyncVerify('<x-container></x-container>', o, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content of the x-container element in settings',
			},
		]);
		await testAsyncAndSyncVerify('<x-container><x-item>0</x-item></x-container>', o, [rule], 'en', [
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content of the x-container element in settings',
			},
		]);
		await testAsyncAndSyncVerify(
			'<x-container><x-item>0</x-item><x-item>1</x-item><x-item>2</x-item></x-container>',
			o,
			[rule],
			'en',
		);
		await testAsyncAndSyncVerify(
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
		await testAsyncAndSyncVerify(
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
			[
				{
					ruleId: 'permitted-contents',
					severity: 'error',
					line: 1,
					col: 1,
					raw: '<x-container>',
					message: 'Invalid content of the x-container element in settings',
				},
			]
		);
	});
});
