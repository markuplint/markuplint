import { rePCEN, reStartTag, reTagName } from './const';

const reAttrsInStartTag = /\s*[^\x00-\x1f\x7f-\x9f "'>\/=]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s]*))?/;

import { MLASTAttr, MLToken } from '@markuplint/ml-ast/src';

import getEndCol from './get-end-col';
import getEndLine from './get-end-line';

export default function parseRawTag(raw: string, nodeLine: number, nodeCol: number, startOffset: number) {
	let line = nodeLine;
	let col = nodeCol;
	let offset = startOffset;

	const matches = raw.match(reStartTag);
	if (!matches) {
		throw new SyntaxError(`Invalid tag syntax: ${raw}`);
	}
	const tagWithAttrs = matches[1];

	const tagName = tagWithAttrs.split(/[\u0009\u000A\u000C\u0020\/]/)[0];
	if (!tagName || (!reTagName.test(tagName) && !rePCEN.test(tagName))) {
		throw new SyntaxError(`Invalid tag name: "${tagName}" in <${tagWithAttrs}>`);
	}
	let rawAttrs = tagWithAttrs.substring(tagName.length);

	col += tagName.length + 1;
	offset += tagName.length + 1;

	const attrs: MLASTAttr[] = [];

	while (reAttrsInStartTag.test(rawAttrs)) {
		const attrMatchedMap = rawAttrs.match(reAttrsInStartTag);
		if (attrMatchedMap && attrMatchedMap[0]) {
			const rawAttr = attrMatchedMap[0];
			const attr = attrTokenizer(rawAttr, line, col, offset);
			line = attr.endLine;
			col = attr.endCol;
			offset = attr.endOffset;
			rawAttrs = rawAttrs.substr(rawAttr.length);
			attrs.push(attr);
		}
	}

	return {
		tagName,
		attrs,
	};
}

function attrTokenizer(raw: string, line: number, col: number, startOffset: number): MLASTAttr {
	const attrMatchedMap = raw.match(reAttrsInStartTag);
	if (!attrMatchedMap) {
		throw new SyntaxError('Illegal attribute token');
	}

	const beforeSpaces = attrMatchedMap[1];
	const name = attrMatchedMap[2];
	const spacesBeforeEqual = attrMatchedMap[3] || '';
	const equal = attrMatchedMap[4] || null;
	const spacesAfterEqual = attrMatchedMap[5] || '';
	const quote = attrMatchedMap[6] != null ? '"' : attrMatchedMap[7] != null ? "'" : null;
	const value = attrMatchedMap[6] || attrMatchedMap[7] || attrMatchedMap[8] || (quote ? '' : null);
	const index = attrMatchedMap.index!; // no global matches
	const invalid =
		!!(value && quote === null && /["'=<>`]/.test(value)) || !!(equal && quote === null && value === null);

	// console.log({beforeSpaces, name, spacesBeforeEqual, equal, spacesAfterEqual, quote, value});

	let offset = startOffset;

	const loc = tokenizer(raw.substr(beforeSpaces.length), line, col, offset);

	const _beforeSpaces = tokenizer(beforeSpaces, line, col, offset);
	line = _beforeSpaces.endLine;
	col = _beforeSpaces.endCol;
	offset = _beforeSpaces.endOffset;

	let _name = tokenizer(name, line, col, offset);
	line = _name.endLine;
	col = _name.endCol;
	offset = _name.endOffset;

	let _spacesBeforeEqual = tokenizer(spacesBeforeEqual, line, col, offset);
	line = _spacesBeforeEqual.endLine;
	col = _spacesBeforeEqual.endCol;
	offset = _spacesBeforeEqual.endOffset;

	let _equal = equal ? tokenizer(equal, line, col, offset) : null;
	if (_equal) {
		line = _equal.endLine;
		col = _equal.endCol;
		offset = _equal.endOffset;
	}

	let _spacesAfterEqual = tokenizer(spacesAfterEqual, line, col, offset);
	line = _spacesAfterEqual.endLine;
	col = _spacesAfterEqual.endCol;
	offset = _spacesAfterEqual.endOffset;

	let _tokenBeforeValue: MLToken | null = null;
	if (quote) {
		_tokenBeforeValue = tokenizer(quote, line, col, offset);
		line = _tokenBeforeValue.endLine;
		col = _tokenBeforeValue.endCol;
		offset = _tokenBeforeValue.endOffset;
	}

	let _value: MLToken | null = null;
	if (value != null) {
		_value = tokenizer(value, line, col, offset);
		line = _value.endLine;
		col = _value.endCol;
		offset = _value.endOffset;
	}
	let _tokenAfterValue: MLToken | null = null;
	if (quote) {
		_tokenAfterValue = tokenizer(quote, line, col, offset);
		line = _tokenAfterValue.endLine;
		col = _tokenAfterValue.endCol;
		offset = _tokenAfterValue.endOffset;
	}

	return {
		raw,
		startOffset: loc.startOffset,
		endOffset: loc.endOffset,
		startLine: loc.startLine,
		endLine: loc.endLine,
		startCol: loc.startCol,
		endCol: loc.endCol,
		name: _name,
		spacesBeforeEqual: _spacesBeforeEqual,
		equal: _equal,
		spacesAfterEqual: _spacesAfterEqual,
		tokenBeforeValue: _tokenBeforeValue,
		value: _value,
		tokenAfterValue: _tokenAfterValue,
		isInvalid: invalid,
	};
}

function tokenizer(raw: string, line: number, col: number, startOffset: number): MLToken {
	return {
		raw,
		startLine: line,
		endLine: getEndLine(raw, line),
		startCol: col,
		endCol: getEndCol(raw, col),
		startOffset,
		endOffset: startOffset + raw.length,
	};
}
