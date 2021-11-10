import { sliceFragment, tokenizer_v2, uuid } from '@markuplint/parser-utils';
import { ASTAttribute } from './astro-parser';
import { MLASTHTMLAttr } from '@markuplint/ml-ast';

export function attrTokenizer(attr: ASTAttribute, rawHtml: string, codeOffset: number): MLASTHTMLAttr {
	const { raw, startOffset } = sliceFragment(rawHtml, attr.start + codeOffset, attr.end + codeOffset);

	const isDynamicValue =
		attr.value?.some?.(v => {
			// @ts-ignore
			return v.type === 'MustacheTag';
		}) || undefined;

	const attrToken = tokenizer_v2(raw, startOffset, rawHtml);

	const beforeCode = rawHtml.slice(0, attrToken.startOffset);
	const beforeAttrMatched = beforeCode.match(/\s+$/m);
	const beforeAttrChar = beforeAttrMatched?.[0] || '';

	const spacesBeforeName = tokenizer_v2(beforeAttrChar, attrToken.startOffset - beforeAttrChar.length, rawHtml);

	const name = tokenizer_v2(attr.name, spacesBeforeName.endOffset, rawHtml);

	let rawValue: string;
	let rawValueStart: number;

	if (
		//
		!attr.value ||
		// @ts-ignore
		attr.value === true ||
		//
		attr.value.length === 0
	) {
		rawValue = '';
		rawValueStart = name.endOffset;
	} else if (isDynamicValue) {
		rawValue = attr.value[0].expression.codeChunks.join('');
		rawValueStart = attr.value[0].expression.start;
	} else {
		rawValue = attr.value[0].raw;
		rawValueStart = attr.value[0].start;
	}

	const value = tokenizer_v2(rawValue, rawValueStart + codeOffset, rawHtml);

	const eq = sliceFragment(rawHtml, name.endOffset, value.startOffset);
	const eqRegexp = /^(?<bs>\s*)(?<eq>=)(?<as>\s*)(?<squot>"|'|{)?$/g;
	const exp = eqRegexp.exec(eq.raw);

	const bsChar = exp?.groups?.bs || '';
	const eqChar = exp?.groups?.eq || '';
	const asChar = exp?.groups?.as || '';
	const squotChar = exp?.groups?.squot || '';

	const spacesBeforeEqual = tokenizer_v2(bsChar, name.endOffset, rawHtml);
	const equal = tokenizer_v2(eqChar, spacesBeforeEqual.endOffset, rawHtml);
	const spacesAfterEqual = tokenizer_v2(asChar, equal.endOffset, rawHtml);
	const startQuote = tokenizer_v2(squotChar, spacesAfterEqual.endOffset, rawHtml);
	const endQuote = tokenizer_v2(squotChar === '{' ? '}' : squotChar, value.endOffset, rawHtml);

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
		isDynamicValue,
	};
}
