import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { tokenizer, uuid } from '@markuplint/parser-utils';

const reAttrsInStartTag =
	// eslint-disable-next-line no-control-regex
	/(\s*)([^\x00-\x1f "'/=>\x7f-\x9f]+)(?:(\s*)(=)(\s*)(?:(?:"([^"]*)")|(?:'([^']*)')|(\S*)))?/;

export default function attrTokenizer(raw: string, line: number, col: number, startOffset: number): MLASTHTMLAttr {
	const attrMatchedMap = raw.match(reAttrsInStartTag);
	if (!attrMatchedMap) {
		throw new SyntaxError('Illegal attribute token');
	}

	const spacesBeforeAttrString = attrMatchedMap[1] ?? '';
	const nameChars = attrMatchedMap[2] ?? '';
	const spacesBeforeEqualChars = attrMatchedMap[3] ?? '';
	const equalChars = attrMatchedMap[4] ?? null;
	const spacesAfterEqualChars = attrMatchedMap[5] ?? '';
	const quoteChars = attrMatchedMap[6] != null ? '"' : attrMatchedMap[7] != null ? "'" : null;
	const valueChars = attrMatchedMap[6] ?? attrMatchedMap[7] ?? attrMatchedMap[8] ?? (quoteChars ? '' : null);

	let offset = startOffset;

	const spacesBeforeName = tokenizer(spacesBeforeAttrString, line, col, offset);
	line = spacesBeforeName.endLine;
	col = spacesBeforeName.endCol;
	offset = spacesBeforeName.endOffset;

	const name = tokenizer(nameChars, line, col, offset);
	line = name.endLine;
	col = name.endCol;
	offset = name.endOffset;

	const spacesBeforeEqual = tokenizer(spacesBeforeEqualChars, line, col, offset);
	line = spacesBeforeEqual.endLine;
	col = spacesBeforeEqual.endCol;
	offset = spacesBeforeEqual.endOffset;

	const equal = tokenizer(equalChars, line, col, offset);
	line = equal.endLine;
	col = equal.endCol;
	offset = equal.endOffset;

	const spacesAfterEqual = tokenizer(spacesAfterEqualChars, line, col, offset);
	line = spacesAfterEqual.endLine;
	col = spacesAfterEqual.endCol;
	offset = spacesAfterEqual.endOffset;

	const startQuote = tokenizer(quoteChars, line, col, offset);
	line = startQuote.endLine;
	col = startQuote.endCol;
	offset = startQuote.endOffset;

	const value = tokenizer(valueChars, line, col, offset);
	line = value.endLine;
	col = value.endCol;
	offset = value.endOffset;

	const endQuote = tokenizer(quoteChars, line, col, offset);

	const attrToken = tokenizer(
		nameChars +
			spacesBeforeEqualChars +
			(equalChars ?? '') +
			spacesAfterEqualChars +
			(quoteChars ?? '') +
			(valueChars ?? '') +
			(quoteChars ?? ''),
		name.startLine,
		name.startCol,
		name.startOffset,
	);

	return {
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
}
