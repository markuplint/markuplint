import { tokenizer, uuid } from '@markuplint/parser-utils';
import { ASTAttr } from './pug-parser';
import { MLASTAttr } from '@markuplint/ml-ast';

export default function attrTokenizer(attr: ASTAttr): MLASTAttr {
	if (/^[#.]/.test(attr.raw)) {
		let value = '';
		if (typeof attr.val === 'string') {
			[, , value] = attr.val.match(/(['"`]?)([^\1]+)(\1)/) || ['', '', ''];
		} else {
			value = `${attr.val}`;
		}
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
			potentialValue: value,
			valueType: !attr.mustEscape ? 'code' : typeof attr.val === 'boolean' ? 'boolean' : 'string',
			isDuplicatable: attr.raw[0] === '.',
		};
	}

	const spacesBeforeAttrString = '';
	const nameChars = attr.name;
	let spacesBeforeEqualChars: string;
	let equalChars: string;
	let spacesAfterEqualChars: string;
	let quoteChars: string;
	let valueChars: string;
	let isDynamicValue: true | undefined = undefined;

	if (attr.val === true) {
		spacesBeforeEqualChars = '';
		equalChars = '';
		spacesAfterEqualChars = '';
		quoteChars = '';
		valueChars = '';
	} else {
		const wihtoutName = attr.raw.slice(attr.name.length);
		const valueOffset = wihtoutName.indexOf(attr.val);
		const equalAndBeforeSpaceAfterSpace = wihtoutName.slice(0, valueOffset);
		const [, before, equel, after] = equalAndBeforeSpaceAfterSpace.match(/^(\s*)(=)(\s*)$/) || ['', '', '', ''];
		const [, quote, coreValue] = attr.val.match(/(['"`]?)([^\1]+)(\1)/) || ['', '', ''];
		spacesBeforeEqualChars = before;
		equalChars = equel;
		spacesAfterEqualChars = after;
		quoteChars = quote;
		valueChars = coreValue;
		if (quote === '`' || quote === '') {
			isDynamicValue = true;
		}
	}

	const invalid =
		!!(valueChars && quoteChars === null && /["'=<>`]/.test(valueChars)) ||
		!!(equalChars && quoteChars === null && valueChars === null);

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
		isInvalid: invalid,
		isDynamicValue,
		isDuplicatable,
	};
}
