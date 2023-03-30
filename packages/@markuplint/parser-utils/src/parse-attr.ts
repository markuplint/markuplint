import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { createTokenFromRawCode, tokenizer, uuid } from './create-token';

type ParseAttrOptions = {
	readonly booleanish?: boolean;
	readonly valueDelimiters?: readonly ValueDelimiter[];
	readonly equal?: string;
};

type ValueDelimiter = {
	readonly start: string;
	readonly end: string;
};

export const defaultValueDelimiters: readonly ValueDelimiter[] = [
	{
		start: "'",
		end: "'",
	},
	{
		start: '"',
		end: '"',
	},
];

const defaultEqual = '=';

const spaceRegex = /^\s$/;

export function parseAttr(raw: string, offset: number, html: string, options?: ParseAttrOptions): MLASTHTMLAttr {
	const tokens = tokenize(raw, options);
	tokens.beforeName;

	const attrToken = createTokenFromRawCode(raw, offset, html);
	const spacesBeforeName = tokenizer(
		tokens.beforeName,
		attrToken.startLine,
		attrToken.startCol,
		attrToken.startOffset,
	);
	const name = tokenizer(tokens.name, spacesBeforeName.endLine, spacesBeforeName.endCol, spacesBeforeName.endOffset);
	const spacesBeforeEqual = tokenizer(tokens.afterName, name.endLine, name.endCol, name.endOffset);
	const equal = tokenizer(
		tokens.equal,
		spacesBeforeEqual.endLine,
		spacesBeforeEqual.endCol,
		spacesBeforeEqual.endOffset,
	);
	const spacesAfterEqual = tokenizer(tokens.beforeValue, equal.endLine, equal.endCol, equal.endOffset);
	const startQuote = tokenizer(
		tokens.startQuote,
		spacesAfterEqual.endLine,
		spacesAfterEqual.endCol,
		spacesAfterEqual.endOffset,
	);
	const value = tokenizer(tokens.value, startQuote.endLine, startQuote.endCol, startQuote.endOffset);
	const endQuote = tokenizer(tokens.endQuote, value.endLine, value.endCol, value.endOffset);

	const attr: MLASTHTMLAttr = {
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
		nextNode: null,
		prevNode: null,
		isFragment: false,
		isGhost: false,
	};

	return attr;
}

export function tokenize(raw: string, options?: ParseAttrOptions) {
	const valueDelimiters = options?.valueDelimiters ?? defaultValueDelimiters;
	const equalDelimiter = options?.equal ?? defaultEqual;

	let state: 'b-name' | 'name' | 'a-name' | 'value-start' | 'value' = 'b-name';

	const charactors = raw.split('');
	let beforeName = '';
	let name = '';
	let afterName = '';
	let equal = '';
	let valueDelimiter: ValueDelimiter | null = null;
	let beforeValue = '';
	let startQuote = '';
	let value = '';
	let endQuote = '';
	let afterAttr = '';
	while (charactors.length) {
		const charactor = charactors.shift()!;

		if (state === 'b-name') {
			if (spaceRegex.test(charactor)) {
				beforeName += charactor;
				continue;
			}

			name += charactor;
			state = 'name';
			continue;
		}

		if (state === 'name') {
			if (equalDelimiter === charactor) {
				equal = equalDelimiter;
				state = 'value-start';
				continue;
			}

			if (spaceRegex.test(charactor)) {
				afterName += charactor;
				state = 'a-name';
				continue;
			}

			name += charactor;
			continue;
		}

		if (state === 'a-name') {
			if (equalDelimiter === charactor) {
				equal = equalDelimiter;
				state = 'value-start';
				continue;
			}

			if (spaceRegex.test(charactor)) {
				afterName += charactor;
				continue;
			}

			break;
		}

		if (state === 'value-start') {
			if (spaceRegex.test(charactor)) {
				beforeValue += charactor;
				continue;
			}

			valueDelimiter = valueDelimiters.find(d => d.start === charactor) ?? null;
			if (valueDelimiter) {
				startQuote += valueDelimiter.start;
			} else {
				value += beforeValue + charactor;
				beforeValue = '';
			}
			state = 'value';
			continue;
		}

		if (state !== 'value') {
			throw new Error('ParseError: unknown parse state in the attribute');
		}

		value += charactor;
	}

	if (valueDelimiter) {
		const endQuoteIndex = value.lastIndexOf(valueDelimiter.end);
		endQuote = value.slice(endQuoteIndex, endQuoteIndex + 1);
		afterAttr = value.slice(endQuoteIndex + 1);
		value = value.slice(0, endQuoteIndex);
	}

	return {
		beforeName,
		name,
		afterName,
		equal,
		beforeValue,
		startQuote,
		value,
		endQuote,
		afterAttr,
	};
}
