import type { ASTAttribute } from './astro-parser';
import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { createTokenFromRawCode, sliceFragment, uuid } from '@markuplint/parser-utils';

export function attrTokenizer(attr: ASTAttribute, rawHtml: string, codeOffset: number): MLASTHTMLAttr {
	const { raw, startOffset } = sliceFragment(rawHtml, attr.start + codeOffset, attr.end + codeOffset);

	const isDynamicValue =
		attr.value?.some?.(v => {
			// @ts-ignore
			return v.type === 'MustacheTag';
		}) || undefined;

	const attrToken = createTokenFromRawCode(raw, startOffset, rawHtml);

	const beforeCode = rawHtml.slice(0, attrToken.startOffset);
	const beforeAttrMatched = beforeCode.match(/\s+$/m);
	const beforeAttrChar = beforeAttrMatched?.[0] || '';

	const spacesBeforeName = createTokenFromRawCode(
		beforeAttrChar,
		attrToken.startOffset - beforeAttrChar.length,
		rawHtml,
	);

	const name = createTokenFromRawCode(attr.name, spacesBeforeName.endOffset, rawHtml);

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

	const value = createTokenFromRawCode(rawValue, rawValueStart + codeOffset, rawHtml);

	const eq = sliceFragment(rawHtml, name.endOffset, value.startOffset);
	const eqRegexp = /^(?<bs>\s*)(?<eq>=)(?<as>\s*)(?<squot>"|'|{)?$/g;
	const exp = eqRegexp.exec(eq.raw);

	const bsChar = exp?.groups?.bs || '';
	const eqChar = exp?.groups?.eq || '';
	const asChar = exp?.groups?.as || '';
	const squotChar = exp?.groups?.squot || '';

	const spacesBeforeEqual = createTokenFromRawCode(bsChar, name.endOffset, rawHtml);
	const equal = createTokenFromRawCode(eqChar, spacesBeforeEqual.endOffset, rawHtml);
	const spacesAfterEqual = createTokenFromRawCode(asChar, equal.endOffset, rawHtml);
	const startQuote = createTokenFromRawCode(squotChar, spacesAfterEqual.endOffset, rawHtml);
	const endQuote = createTokenFromRawCode(squotChar === '{' ? '}' : squotChar, value.endOffset, rawHtml);

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
		isDynamicValue,
		nodeName: name.raw,
		parentNode: null,
		nextNode: null,
		prevNode: null,
		isFragment: false,
		isGhost: false,
	};

	/**
	 * Detects Template Directive
	 *
	 * @see https://docs.astro.build/en/reference/directives-reference/
	 */
	const [, directive] = name.raw.match(/^([^:]+):([^:]+)$/) || [];
	if (directive) {
		const lowerCaseDirectiveName = directive.toLowerCase();
		switch (lowerCaseDirectiveName) {
			case 'class': {
				result.potentialName = lowerCaseDirectiveName;
				break;
			}
			default: {
				result.isDirective = true;
			}
		}
	}

	return result;
}
