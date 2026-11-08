import type { ParseOptions, ParserOptions } from './types.js';

import { describe, expect, test } from 'vitest';

import { Parser } from './parser.js';

/** Records the source that its tokenizer is given. */
class RecordingParser extends Parser {
	seen = '';

	tokenize() {
		this.seen = this.rawCode;
		return { ast: [], isFragment: true };
	}
}

/** A `beforeParse` that puts something in front of the source. */
class PrependingParser extends RecordingParser {
	beforeParse(rawCode: string, options?: ParseOptions) {
		return 'x' + super.beforeParse(rawCode, options);
	}
}

function seenBy(options: ParserOptions | undefined, code: string, parseOptions?: ParseOptions) {
	const parser = new RecordingParser(options);
	parser.parse(code, parseOptions);
	return parser.seen;
}

describe("leadingBom: 'mask'", () => {
	const options = { leadingBom: 'mask' } as const;

	test('replaces the BOM with one space', () => {
		expect(seenBy(options, '\uFEFF<p>')).toBe(' <p>');
	});

	test('replaces a source that is only the BOM', () => {
		expect(seenBy(options, '\uFEFF')).toBe(' ');
	});

	test('replaces only the first of two BOMs', () => {
		expect(seenBy(options, '\uFEFF\uFEFF<p>')).toBe(' \uFEFF<p>');
	});

	test('keeps the line break after the BOM', () => {
		expect(seenBy(options, '\uFEFF\r\n<p>')).toBe(' \r\n<p>');
	});

	test('leaves a source without a BOM as it is', () => {
		expect(seenBy(options, '<p>')).toBe('<p>');
	});

	test('leaves a U+FEFF that is not the first character as it is', () => {
		expect(seenBy(options, '<p>\uFEFF')).toBe('<p>\uFEFF');
	});

	test('leaves a U+FEFF of code that starts at an offset as it is', () => {
		expect(seenBy(options, '\uFEFF<p>', { offsetOffset: 3 })).toBe('   \uFEFF<p>');
	});

	test('does nothing when beforeParse no longer leaves the BOM first', () => {
		const parser = new PrependingParser(options);
		parser.parse('\uFEFF<p>');
		expect(parser.seen).toBe('x\uFEFF<p>');
	});

	test('keeps the BOM in the raw of the document', () => {
		expect(new RecordingParser(options).parse('\uFEFF<p>').raw).toBe('\uFEFF<p>');
	});

	test('keeps the BOM in the front matter and masks the rest of it', () => {
		const parser = new RecordingParser(options);
		const doc = parser.parse('\uFEFF---\nk: v\n---\n<p>', { ignoreFrontMatter: true });
		expect(parser.seen).toBe('    \n    \n   \n<p>');
		expect(doc.nodeList.map(n => [n.raw, n.offset, n.line, n.col])).toStrictEqual([
			['\uFEFF---\nk: v\n---\n', 0, 1, 1],
		]);
	});
});

describe("leadingBom: 'strip'", () => {
	const options = { leadingBom: 'strip' } as const;

	test('takes the BOM away', () => {
		expect(seenBy(options, '\uFEFF<p>')).toBe('<p>');
	});

	test('takes away a source that is only the BOM', () => {
		expect(seenBy(options, '\uFEFF')).toBe('');
	});

	test('takes away only the first of two BOMs', () => {
		expect(seenBy(options, '\uFEFF\uFEFF<p>')).toBe('\uFEFF<p>');
	});

	test('keeps the line break after the BOM', () => {
		expect(seenBy(options, '\uFEFF\r\n<p>')).toBe('\r\n<p>');
	});

	test('leaves a source without a BOM as it is', () => {
		expect(seenBy(options, '<p>')).toBe('<p>');
	});

	test('leaves a U+FEFF of code that starts at an offset as it is', () => {
		expect(seenBy(options, '\uFEFF<p>', { offsetOffset: 3 })).toBe('   \uFEFF<p>');
	});

	test('does nothing when beforeParse no longer leaves the BOM first', () => {
		const parser = new PrependingParser(options);
		parser.parse('\uFEFF<p>');
		expect(parser.seen).toBe('x\uFEFF<p>');
	});

	test('keeps the BOM in the raw of the document', () => {
		expect(new RecordingParser(options).parse('\uFEFF<p>').raw).toBe('\uFEFF<p>');
	});

	test('finds a front matter that starts after the BOM, and moves it one character later', () => {
		const parser = new RecordingParser(options);
		const doc = parser.parse('\uFEFF---\nk: v\n---\n<p>', { ignoreFrontMatter: true });
		expect(parser.seen).toBe('   \n    \n   \n<p>');
		expect(doc.nodeList.map(n => [n.raw, n.offset, n.line, n.col])).toStrictEqual([['---\nk: v\n---\n', 1, 1, 2]]);
	});
});

describe('leadingBom unset', () => {
	test('leaves the BOM as it is', () => {
		expect(seenBy(undefined, '\uFEFF<p>')).toBe('\uFEFF<p>');
	});
});
