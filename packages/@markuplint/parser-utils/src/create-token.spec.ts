import { tokenizer } from './create-token';

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
