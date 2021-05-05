import { getEndCol, getEndLine, tokenizer } from './';

describe('getEndLine', () => {
	it('empty', () => {
		expect(getEndLine('', 1)).toBe(1);
		expect(getEndLine('', 3)).toBe(3);
	});

	it('basic', () => {
		expect(getEndLine('\n\n', 2)).toBe(4);
		expect(getEndLine('\n\n', 4)).toBe(6);
		expect(getEndLine('\n\n  \n  \n  foo', 1)).toBe(5);
		expect(getEndLine('\n\n  \n  \n  foo', 6)).toBe(10);
	});
});

describe('getEndCol', () => {
	it('empty', () => {
		expect(getEndCol('', 1)).toBe(1);
		expect(getEndCol('', 3)).toBe(3);
	});

	it('basic', () => {
		expect(getEndCol('  ', 2)).toBe(4);
		expect(getEndCol('  ', 4)).toBe(6);
		expect(getEndCol('foo bar', 1)).toBe(8);
		expect(getEndCol('foo bar', 6)).toBe(13);
	});

	it('with line break', () => {
		expect(getEndCol('foo bar\n', 4)).toBe(1);
		expect(getEndCol('foo bar\n', 4)).toBe(1);
		expect(getEndCol('foo bar\n  ', 4)).toBe(3);
		expect(getEndCol('foo bar\n  ', 4)).toBe(3);
		expect(getEndCol('foo bar\nfoo bar', 1)).toBe(8);
		expect(getEndCol('foo bar\nfoo bar', 6)).toBe(8);
	});
});

describe('tokenizer', () => {
	it('empty', () => {
		expect(tokenizer('', 1, 1, 0)).toEqual(
			expect.objectContaining({
				raw: '',
				startLine: 1,
				startCol: 1,
				startOffset: 0,
				endLine: 1,
				endCol: 1,
				endOffset: 0,
			}),
		);
	});
});
