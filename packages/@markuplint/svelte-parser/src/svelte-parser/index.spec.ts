// @ts-nocheck

import svelteParse from './';

describe('parser', () => {
	test('if', () => {
		expect(svelteParse('{#if cond}text{/if}')).toEqual([
			{
				type: 'IfBlock',
				start: 0,
				end: 19,
				expression: {
					end: 9,
					loc: { end: { column: 9, line: 1 }, start: { column: 5, line: 1 } },
					name: 'cond',
					start: 5,
					type: 'Identifier',
				},
				children: [{ data: 'text', end: 14, raw: 'text', start: 10, type: 'Text' }],
			},
		]);
	});

	test('if else', () => {
		expect(svelteParse('{#if cond}text1{:else}text2{/if}')).toEqual([
			{
				type: 'IfBlock',
				start: 0,
				end: 32,
				expression: {
					end: 9,
					loc: { end: { column: 9, line: 1 }, start: { column: 5, line: 1 } },
					name: 'cond',
					start: 5,
					type: 'Identifier',
				},
				children: [{ data: 'text1', end: 15, raw: 'text1', start: 10, type: 'Text' }],
				else: {
					children: [{ data: 'text2', end: 27, raw: 'text2', start: 22, type: 'Text' }],
					end: 27,
					start: 22,
					type: 'ElseBlock',
				},
			},
		]);
	});

	test('if else if', () => {
		expect(svelteParse('{#if cond}text1{:else if cond}text2{/if}')).toEqual([
			{
				type: 'IfBlock',
				start: 0,
				end: 40,
				expression: {
					end: 9,
					loc: { end: { column: 9, line: 1 }, start: { column: 5, line: 1 } },
					name: 'cond',
					start: 5,
					type: 'Identifier',
				},
				children: [{ data: 'text1', end: 15, raw: 'text1', start: 10, type: 'Text' }],
				else: {
					type: 'ElseBlock',
					start: 30,
					end: 35,
					children: [
						{
							type: 'IfBlock',
							start: 30,
							end: 40,
							elseif: true,
							children: [{ data: 'text2', end: 35, raw: 'text2', start: 30, type: 'Text' }],
							expression: {
								end: 29,
								loc: { end: { column: 29, line: 1 }, start: { column: 25, line: 1 } },
								name: 'cond',
								start: 25,
								type: 'Identifier',
							},
						},
					],
				},
			},
		]);
	});

	test('white spaces with if', () => {
		expect(svelteParse('text1  {#if cond}  text2  {/if}  ')).toEqual([
			{
				data: 'text1  ',
				end: 7,
				raw: 'text1  ',
				start: 0,
				type: 'Text',
			},
			{
				type: 'IfBlock',
				start: 7,
				end: 31,
				expression: {
					end: 16,
					loc: { end: { column: 16, line: 1 }, start: { column: 12, line: 1 } },
					name: 'cond',
					start: 12,
					type: 'Identifier',
				},
				children: [{ data: 'text2', end: 26, raw: '  text2  ', start: 17, type: 'Text' }],
			},
		]);
	});
});
