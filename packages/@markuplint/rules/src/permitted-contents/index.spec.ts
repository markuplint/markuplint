import * as markuplint from 'markuplint';
import rule from './';

describe('verify', () => {
	test('ui > li', async () => {
		const o = {
			rules: {
				'permitted-contents': {
					option: [
						{
							tag: 'ul',
							contents: [
								{
									oneOrMore: 'li',
								},
							],
						},
					],
				},
			},
		};
		const r1 = await markuplint.verify('<ul></ul>', o, [rule], 'en');
		const r2 = await markuplint.verify('<ul><li>0</li></ul>', o, [rule], 'en');
		const r3 = await markuplint.verify('<ul><li>0</li><li>1</li><li>2</li></ul>', o, [rule], 'en');
		const r4 = await markuplint.verify('<ul> <li>0</li> <li>1</li> <li>2</li> </ul>', o, [rule], 'en');
		const r5 = await markuplint.verify('<ul> <li>0</li> <li>1</li> <li>2</li> 3 </ul>', o, [rule], 'en');
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<ul>',
				message: 'Invalid content, Require one or more "li" element',
			},
		]);
		expect(r2).toStrictEqual([]);
		expect(r3).toStrictEqual([]);
		expect(r4).toStrictEqual([]);
		expect(r5).toStrictEqual([
			{
				col: 38,
				line: 1,
				message: 'Invalid contents, "ul" is unpermitted to contain "TextNode"',
				raw: ' 3 ',
				ruleId: 'permitted-contents',
				severity: 'error',
			},
		]);
	});

	test('table > tbody', async () => {
		const o = {
			rules: {
				'permitted-contents': {
					option: [
						{
							tag: 'table',
							contents: [
								{
									require: 'tbody',
								},
							],
						},
					],
				},
			},
		};
		const r1 = await markuplint.verify('<table></table>', o, [rule], 'en');
		const r2 = await markuplint.verify('<table><tbody></tbody></table>', o, [rule], 'en');
		const r3 = await markuplint.verify('<table><tbody></tbody><tbody></tbody></table>', o, [rule], 'en');
		expect(r1).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content, Require "tbody" element',
			},
		]);
		expect(r2).toStrictEqual([]);
		expect(r3).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content, The maximum length of "tbody" elements is 1',
			},
		]);
	});

	test('The strict table', async () => {
		const o = {
			rules: {
				'permitted-contents': {
					option: [
						{
							tag: 'table',
							contents: [
								{
									require: 'caption',
								},
								{
									optional: 'thead',
								},
								{
									optional: 'tfoot',
								},
								{
									require: 'tbody',
								},
							],
						},
					],
				},
			},
		};
		const r1 = await markuplint.verify('<table></table>', o, [rule], 'en');
		const r2 = await markuplint.verify('<table><caption></caption><tbody></tbody></table>', o, [rule], 'en');
		const r3 = await markuplint.verify(
			'<table><caption></caption><thead></thead><tbody></tbody></table>',
			o,
			[rule],
			'en',
		);
		const r4 = await markuplint.verify(
			'<table><caption></caption><tfoot></tfoot><tbody></tbody></table>',
			o,
			[rule],
			'en',
		);
		const r5 = await markuplint.verify(
			'<table><caption></caption><thead></thead><tfoot></tfoot><tbody></tbody></table>',
			o,
			[rule],
			'en',
		);
		const r6 = await markuplint.verify(
			'<table><caption></caption><thead></thead><tfoot></tfoot><tr></tr><tr></tr><tr></tr></table>',
			o,
			[rule],
			'en',
		);
		const r7 = await markuplint.verify(
			'<table><caption></caption><tfoot></tfoot><thead></thead><tbody></tbody></table>',
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
				raw: '<table>',
				message: 'Invalid content, Require "caption" element',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content, Require "tbody" element',
			},
		]);
		expect(r2).toStrictEqual([]);
		expect(r3).toStrictEqual([]);
		expect(r4).toStrictEqual([]);
		expect(r5).toStrictEqual([]);
		expect(r6).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content, Require "tbody" element',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 57,
				raw: '<tr>',
				message: 'Invalid contents, "table" is unpermitted to contain "tr"',
			},
		]);
		expect(r7).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<table>',
				message: 'Invalid content, Require "tbody" element',
			},
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 42,
				raw: '<thead>',
				message: 'Invalid contents, "table" is unpermitted to contain "thead"',
			},
		]);
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
				message: 'Invalid content, Require "x-item" element at least 2',
			},
		]);
		expect(r2).toStrictEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<x-container>',
				message: 'Invalid content, Require "x-item" element at least 2',
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
				message: 'Invalid content, The maximum length of "x-item" elements is 5',
			},
		]);
	});
});
