import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { attrTokenizer } from '@markuplint/html-parser';
import { tokenizer, uuid } from '@markuplint/parser-utils';

// eslint-disable-next-line no-control-regex
const reNameOnly = /^[^\x00-\x1f\x7f-\x9f {>/=]+/;
// eslint-disable-next-line no-control-regex
const reBeforeStructure = /^(\s*)([^\x00-\x1f\x7f-\x9f {>/=]+)(\s*)(=)(\s*){(\s*)$/;
const reBeforeStructureWithoutName = /^{(\s*)$/;
const reAfterStructure = /(\s*)}/;

export default function directiveTokenizer(
	raw: string,
	rawValue: string,
	line: number,
	col: number,
	startOffset: number,
): MLASTHTMLAttr {
	let spacesBeforeAttrString = '';
	let nameChars = '';
	let spacesBeforeEqualChars = '';
	let equalChars: string | null = null;
	let spacesAfterEqualChars = '';
	let valueChars = '';

	const [before, after] = raw.split(rawValue);
	const beforeMatchedMap = before?.match(reBeforeStructure);
	const beforeWithoutNameMatchedMap = before?.match(reBeforeStructureWithoutName);
	const afterMatchedMap = after?.match(reAfterStructure);

	if (beforeMatchedMap && afterMatchedMap) {
		spacesBeforeAttrString = beforeMatchedMap[1] ?? '';
		nameChars = beforeMatchedMap[2] ?? '';
		spacesBeforeEqualChars = beforeMatchedMap[3] ?? '';
		equalChars = beforeMatchedMap[4] ?? null;
		spacesAfterEqualChars = beforeMatchedMap[5] ?? '';
		valueChars = (beforeMatchedMap[6] ?? '') + rawValue + (afterMatchedMap[1] || '');
	} else if (beforeWithoutNameMatchedMap && afterMatchedMap) {
		valueChars = (beforeWithoutNameMatchedMap[1] || '') + rawValue + (afterMatchedMap[1] || '');
	} else if (reNameOnly.test(raw)) {
		const token = attrTokenizer(raw, line, col, startOffset);
		token.isDirective = true;
		return token;
	} else {
		throw new SyntaxError('Illegal attribute token');
	}

	let offset = startOffset;

	const attrToken = tokenizer(raw, line, col, offset);

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

	const startQuote = tokenizer('{', line, col, offset);
	line = startQuote.endLine;
	col = startQuote.endCol;
	offset = startQuote.endOffset;

	const value = tokenizer(valueChars, line, col, offset);
	line = value.endLine;
	col = value.endCol;
	offset = value.endOffset;

	const endQuote = tokenizer('}', line, col, offset);
	line = endQuote.endLine;
	col = endQuote.endCol;
	offset = endQuote.endOffset;

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
		isDirective: true,
		isDuplicatable: false,
		nodeName: name.raw,
		parentNode: null,
		nextNode: null,
		prevNode: null,
		isFragment: false,
		isGhost: false,
	};

	return result;
}
