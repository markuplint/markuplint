import { MLASTAttr, MLToken } from '@markuplint/ml-ast';
import UUID from 'uuid';
import getEndCol from './get-end-col';
import getEndLine from './get-end-line';

// eslint-disable-next-line no-control-regex
const reAttrsInStartTag = /(\s*)([^\x00-\x1f\x7f-\x9f "'>/=]+)(?:(\s*)(=)(\s*)(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s]*)))?/;

export default function attrTokenizer(raw: string, line: number, col: number, startOffset: number): MLASTAttr {
	const attrMatchedMap = raw.match(reAttrsInStartTag);
	if (!attrMatchedMap) {
		throw new SyntaxError('Illegal attribute token');
	}

	const beforeSpacesChars = attrMatchedMap[1];
	const nameChars = attrMatchedMap[2];
	const spacesBeforeEqualChars = attrMatchedMap[3] || '';
	const equalChars = attrMatchedMap[4] || null;
	const spacesAfterEqualChars = attrMatchedMap[5] || '';
	const quoteChars = attrMatchedMap[6] != null ? '"' : attrMatchedMap[7] != null ? "'" : null;
	const valueChars = attrMatchedMap[6] || attrMatchedMap[7] || attrMatchedMap[8] || (quoteChars ? '' : null);
	const invalid =
		!!(valueChars && quoteChars === null && /["'=<>`]/.test(valueChars)) ||
		!!(equalChars && quoteChars === null && valueChars === null);

	let offset = startOffset;

	const beforeSpaces = tokenizer(beforeSpacesChars, line, col, offset)!;
	line = beforeSpaces.endLine;
	col = beforeSpaces.endCol;
	offset = beforeSpaces.endOffset;

	const attrToken = tokenizer(raw.substr(beforeSpacesChars.length), line, col, offset)!;

	const name = tokenizer(nameChars, line, col, offset)!;
	if (name) {
		line = name.endLine;
		col = name.endCol;
		offset = name.endOffset;
	}

	const spacesBeforeEqual = equalChars ? tokenizer(spacesBeforeEqualChars, line, col, offset) : null;
	if (spacesBeforeEqual) {
		line = spacesBeforeEqual.endLine;
		col = spacesBeforeEqual.endCol;
		offset = spacesBeforeEqual.endOffset;
	}

	const equal = tokenizer(equalChars, line, col, offset);
	if (equal) {
		line = equal.endLine;
		col = equal.endCol;
		offset = equal.endOffset;
	}

	const spacesAfterEqual = equalChars ? tokenizer(spacesAfterEqualChars, line, col, offset) : null;
	if (spacesAfterEqual) {
		line = spacesAfterEqual.endLine;
		col = spacesAfterEqual.endCol;
		offset = spacesAfterEqual.endOffset;
	}

	const tokenBeforeValue = tokenizer(quoteChars, line, col, offset);
	if (tokenBeforeValue) {
		line = tokenBeforeValue.endLine;
		col = tokenBeforeValue.endCol;
		offset = tokenBeforeValue.endOffset;
	}

	const value = tokenizer(valueChars, line, col, offset);
	if (value) {
		line = value.endLine;
		col = value.endCol;
		offset = value.endOffset;
	}

	const tokenAfterValue = tokenizer(quoteChars, line, col, offset);
	if (tokenAfterValue) {
		line = tokenAfterValue.endLine;
		col = tokenAfterValue.endCol;
		offset = tokenAfterValue.endOffset;
	}

	return {
		uuid: UUID.v4(),
		raw: attrToken.raw,
		startOffset: attrToken.startOffset,
		endOffset: attrToken.endOffset,
		startLine: attrToken.startLine,
		endLine: attrToken.endLine,
		startCol: attrToken.startCol,
		endCol: attrToken.endCol,
		beforeSpaces,
		name,
		spacesBeforeEqual,
		equal,
		spacesAfterEqual,
		tokenBeforeValue,
		value,
		tokenAfterValue,
		isInvalid: invalid,
	};
}

function tokenizer(raw: string | null, line: number, col: number, startOffset: number): MLToken | null {
	if (raw != null) {
		return {
			uuid: UUID.v4(),
			raw,
			startLine: line,
			endLine: getEndLine(raw, line),
			startCol: col,
			endCol: getEndCol(raw, col),
			startOffset,
			endOffset: startOffset + raw.length,
		};
	}
	return null;
}
