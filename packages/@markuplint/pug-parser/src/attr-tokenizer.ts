import type { ASTAttr } from './pug-parser/index.js';
import type { MLASTAttr } from '@markuplint/ml-ast';

import { tokenizer, uuid, scriptParser, removeQuote } from '@markuplint/parser-utils';

export default function attrTokenizer(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: ASTAttr,
): MLASTAttr {
	if (attr.raw[0] === '#' || attr.raw[0] === '.') {
		const value = `${attr.val}`;
		const potentialValue = removeQuote(value);
		return {
			type: 'ps-attr',
			uuid: uuid(),
			raw: attr.raw,
			startOffset: attr.offset,
			endOffset: attr.endOffset,
			startLine: attr.line,
			endLine: attr.endLine,
			startCol: attr.column,
			endCol: attr.endColumn,
			potentialName: attr.name,
			potentialValue,
			valueType: 'string',
			isDuplicatable: attr.raw[0] === '.',
			nodeName: '#pug-special-attr',
			parentNode: null,
			nextNode: null,
			prevNode: null,
			isFragment: false,
			isGhost: false,
		};
	}

	const spacesBeforeAttrString = '';
	const nameChars = attr.name;
	let spacesBeforeEqualChars: string;
	let equalChars: string;
	let spacesAfterEqualChars: string;
	const quoteChars = '';
	let valueChars: string;
	let potentialValue: string;
	let isDynamicValue: true | undefined = undefined;

	if (attr.val === true) {
		spacesBeforeEqualChars = '';
		equalChars = '';
		spacesAfterEqualChars = '';
		valueChars = '';
		potentialValue = '';
	} else {
		const withoutName = attr.raw.slice(attr.name.length);
		const valueOffset = withoutName.indexOf(attr.val);
		const equalAndBeforeSpaceAfterSpace = withoutName.slice(0, valueOffset);
		const [, before, equal, after] = equalAndBeforeSpaceAfterSpace.match(/^(\s*)(=)(\s*)$/) ?? ['', '', '', ''];

		const valueTokens = scriptParser(attr.val);

		spacesBeforeEqualChars = before ?? '';
		equalChars = equal ?? '';
		spacesAfterEqualChars = after ?? '';
		valueChars = attr.val;
		potentialValue = removeQuote(attr.val);
		if (valueTokens.length > 1 || valueTokens[0].type !== 'String') {
			isDynamicValue = true;
		}
	}

	const invalid =
		!!(valueChars && quoteChars === null && /["'<=>`]/.test(valueChars)) ||
		!!(equalChars && quoteChars === null && valueChars === null);

	if (invalid) {
		throw new Error('Parse error: It has invalid attribute');
	}

	let offset = attr.offset;
	let line = attr.line;
	let col = attr.column;

	const attrToken = tokenizer(attr.raw, line, col, offset);

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
	line = endQuote.endLine;
	col = endQuote.endCol;
	offset = endQuote.endOffset;

	let isDuplicatable = false;
	if (name.raw.toLowerCase() === 'class') {
		isDuplicatable = true;
	}

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
		isDynamicValue,
		isDuplicatable,
		potentialValue,
		nodeName: name.raw,
		parentNode: null,
		nextNode: null,
		prevNode: null,
		isFragment: false,
		isGhost: false,
	};
}
