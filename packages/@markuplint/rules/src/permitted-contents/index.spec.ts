import * as markuplint from 'markuplint';
import rule from './';

const ruleOn = {
	rules: {
		'permitted-contents': true,
	},
};

describe('verify', () => {
	test('a', async () => {
		const r1 = await markuplint.verify('<a><div></div><span></span><em></em></a>', ruleOn, [rule], 'en');
		expect(r1).toStrictEqual([]);

		const r2 = await markuplint.verify('<a><h1></h1></a>', ruleOn, [rule], 'en');
		expect(r2).toStrictEqual([]);

		const r3 = await markuplint.verify('<div><a><option></option></a><div>', ruleOn, [rule], 'en');
		expect(r3).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<a>',
				message: 'Invalid content in "a" element on the HTML spec',
			},
		]);

		const r4 = await markuplint.verify('<a><button></button></a>', ruleOn, [rule], 'en');
		expect(r4).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<a>',
				message: 'Invalid content in "a" element on the HTML spec',
			},
		]);

		const r5 = await markuplint.verify('<a><div><div><button></button></div></div></a>', ruleOn, [rule], 'en');
		expect(r5).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<a>',
				message: 'Invalid content in "a" element on the HTML spec',
			},
		]);

		const r6 = await markuplint.verify('<span><a><div></div></a></span>', ruleOn, [rule], 'en');
		expect(r6).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 7,
				raw: '<a>',
				message: 'Invalid content in "a" element on the HTML spec',
			},
		]);
	});

	test('address', async () => {
		const r1 = await markuplint.verify('<address><address></address></address>', ruleOn, [rule], 'en');
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<address>',
				message: 'Invalid content in "address" element on the HTML spec',
			},
		]);
	});

	test('audio', async () => {
		const r1 = await markuplint.verify('<div><audio src="path/to"><source></audio></div>', ruleOn, [rule], 'en');
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<audio src="path/to">',
				message: 'Invalid content in "audio" element on the HTML spec',
			},
		]);

		const r2 = await markuplint.verify('<div><audio><source><div></div></audio></div>', ruleOn, [rule], 'en');
		expect(r2).toStrictEqual([]);
	});

	test('dl', async () => {
		const r1 = await markuplint.verify(
			`<dl>
				<dt></dt>
				<dd></dd>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(r1).toStrictEqual([]);

		const r2 = await markuplint.verify(
			`<dl>
				<dt></dt>
				<dd></dd>
				<div></div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(r2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<dl>',
				message: 'Invalid content in "dl" element on the HTML spec',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 4,
				col: 5,
				raw: '<div>',
				message: 'Invalid content in "div" element on the HTML spec',
			},
		]);

		const r3 = await markuplint.verify(
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
		expect(r3).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<dl>',
				message: 'Invalid content in "dl" element on the HTML spec',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 3,
				col: 5,
				raw: '<div>',
				message: 'Invalid content in "div" element on the HTML spec',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 5,
				col: 5,
				raw: '<div>',
				message: 'Invalid content in "div" element on the HTML spec',
			},
		]);

		const r4 = await markuplint.verify(
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
		expect(r4.length).toStrictEqual(4);

		const r5 = await markuplint.verify(
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
		expect(r5).toStrictEqual([]);

		const r6 = await markuplint.verify(
			`<div>
				<dt></dt>
				<dd></dd>
			</div>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(r6).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<div>',
				message: 'Invalid content in "div" element on the HTML spec',
			},
		]);

		const r7 = await markuplint.verify(
			`<dl>
				<div>
					<span></span>
				</div>
			</dl>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(r7).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 2,
				col: 5,
				raw: '<div>',
				message: 'Invalid content in "div" element on the HTML spec',
			},
		]);
	});

	test('table', async () => {
		const r1 = await markuplint.verify(
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
		expect(r1).toStrictEqual([]);

		const r2 = await markuplint.verify(
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
		expect(r2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content in "table" element on the HTML spec',
			},
		]);
	});

	test('ruby', async () => {
		const r1 = await markuplint.verify(
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
		expect(r1).toStrictEqual([]);

		const r2 = await markuplint.verify(
			`<ruby>
			<span>漢字</span>
			<rp>(</rp>
			<rt>かんじ</rt>
		</ruby>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(r2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<ruby>',
				message: 'Invalid content in "ruby" element on the HTML spec',
			},
		]);

		const r3 = await markuplint.verify(
			`<ruby>
				♥ <rt> Heart <rt lang=fr> Cœur </rt>
				☘ <rt> Shamrock <rt lang=fr> Trèfle </rt>
				✶ <rt> Star <rt lang=fr> Étoile </rt>
			</ruby>`,
			ruleOn,
			[rule],
			'en',
		);
		expect(r3).toStrictEqual([]);
	});

	test('ul', async () => {
		const r1 = await markuplint.verify('<ul><div></div></ul>', ruleOn, [rule], 'en');
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<ul>',
				message: 'Invalid content in "ul" element on the HTML spec',
			},
		]);

		const r2 = await markuplint.verify('<ul><li></li></ul>', ruleOn, [rule], 'en');
		expect(r2).toStrictEqual([]);

		const r3 = await markuplint.verify('<ul><li></li><li></li><li></li></ul>', ruleOn, [rule], 'en');
		expect(r3).toStrictEqual([]);
	});

	test('area', async () => {
		const r1 = await markuplint.verify('<div><area></div>', ruleOn, [rule], 'en');
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 6,
				raw: '<area>',
				message: 'Invalid structure: "area" element must have an ancestor "map"',
			},
		]);

		const r2 = await markuplint.verify('<map><area></map>', ruleOn, [rule], 'en');
		expect(r2).toStrictEqual([]);

		const r3 = await markuplint.verify('<map><div><area></div></map>', ruleOn, [rule], 'en');
		expect(r3).toStrictEqual([]);
	});

	test('Custom element', async () => {
		const o = {
			rules: {
				'permitted-contents': {
					option: [
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
			},
		};
		const r1 = await markuplint.verify('<x-container></x-container>', o, [rule], 'en');
		const r2 = await markuplint.verify('<x-container><x-item>0</x-item></x-container>', o, [rule], 'en');
		const r3 = await markuplint.verify(
			'<x-container><x-item>0</x-item><x-item>1</x-item><x-item>2</x-item></x-container>',
			o,
			[rule],
			'en',
		);
		const r4 = await markuplint.verify(
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
		const r5 = await markuplint.verify(
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
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content in "x-container" element on rule settings',
			},
		]);
		expect(r2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content in "x-container" element on rule settings',
			},
		]);
		expect(r3).toStrictEqual([]);
		expect(r4).toStrictEqual([]);
		expect(r5).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content in "x-container" element on rule settings',
			},
		]);
	});
});
