import type { QuoteSet } from './types.js';
import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { AttrState, attrParser } from './attr-parser.js';
import { tokenizer, uuid } from './create-token.js';

export function attrTokenizer(
	raw: string,
	line: number,
	col: number,
	startOffset: number,
	quoteSet?: ReadonlyArray<QuoteSet>,
	startState = AttrState.BeforeName,
	quoteInValueChars?: ReadonlyArray<QuoteSet>,
	spaces?: ReadonlyArray<string>,
): MLASTHTMLAttr & {
	__leftover?: string;
} {
	const parsed = attrParser(raw, quoteSet, startState, quoteInValueChars, spaces);

	let offset = startOffset;

	const spacesBeforeName = tokenizer(parsed.spacesBeforeAttrName, line, col, offset);
	line = spacesBeforeName.endLine;
	col = spacesBeforeName.endCol;
	offset = spacesBeforeName.endOffset;

	const name = tokenizer(parsed.attrName, line, col, offset);
	line = name.endLine;
	col = name.endCol;
	offset = name.endOffset;

	const spacesBeforeEqual = tokenizer(parsed.spacesBeforeEqual, line, col, offset);
	line = spacesBeforeEqual.endLine;
	col = spacesBeforeEqual.endCol;
	offset = spacesBeforeEqual.endOffset;

	const equal = tokenizer(parsed.equal, line, col, offset);
	line = equal.endLine;
	col = equal.endCol;
	offset = equal.endOffset;

	const spacesAfterEqual = tokenizer(parsed.spacesAfterEqual, line, col, offset);
	line = spacesAfterEqual.endLine;
	col = spacesAfterEqual.endCol;
	offset = spacesAfterEqual.endOffset;

	const startQuote = tokenizer(parsed.quoteStart, line, col, offset);
	line = startQuote.endLine;
	col = startQuote.endCol;
	offset = startQuote.endOffset;

	const value = tokenizer(parsed.attrValue, line, col, offset);
	line = value.endLine;
	col = value.endCol;
	offset = value.endOffset;

	const endQuote = tokenizer(parsed.quoteEnd, line, col, offset);

	const attrToken = tokenizer(
		parsed.attrName +
			parsed.spacesBeforeEqual +
			parsed.equal +
			parsed.spacesAfterEqual +
			parsed.quoteStart +
			parsed.attrValue +
			parsed.quoteEnd,
		name.startLine,
		name.startCol,
		name.startOffset,
	);

	const result: MLASTHTMLAttr = {
		type: 'html-attr',
		uuid: uuid(),
		raw: attrToken.raw,
		startOffset: attrToken.startOffset,
		endOffset: attrToken.endOffset,
		startLine: attrToken.startLine,
		endLine: attrToken.endLine,
		startCol: attrToken.startCol,
		endCol: attrToken.endCol,
		spacesBeforeName,
		name,
		spacesBeforeEqual,
		equal,
		spacesAfterEqual,
		startQuote,
		value,
		endQuote,
		isDuplicatable: false,
		nodeName: name.raw,
		parentNode: null,
		prevNode: null,
		nextNode: null,
		isFragment: false,
		isGhost: false,
	};

	if (parsed.leftover) {
		return {
			...result,
			__leftover: parsed.leftover,
		};
	}

	return result;
}
