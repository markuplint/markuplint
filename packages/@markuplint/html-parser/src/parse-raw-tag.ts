import type { MLASTAttr, MLToken } from '@markuplint/ml-ast';

import { reTag, reTagName, isPotentialCustomElementName, tokenizer } from '@markuplint/parser-utils';

import attrTokenizer from './attr-tokenizer.js';

// eslint-disable-next-line no-control-regex
const reAttrsInStartTag = /\s*[^\u0000-\u001F "'/=>\u007F-\u009F]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|\S*))?/;
const reEndTokens = /(\s*\/)?(\s*)>$/;

type TagTokens = {
	tagName: string;
	attrs: MLASTAttr[];
	selfClosingSolidus: MLToken;
	endSpace: MLToken;
};

export default function parseRawTag(
	raw: string,
	startLine: number,
	startCol: number,
	startOffset: number,
	offsetOffset = 0,
	offsetLine = 0,
	offsetColumn = 0,
): TagTokens {
	let offset = startOffset + offsetOffset;
	let line = startLine + offsetLine;
	let col = startCol + (startLine === 1 ? offsetColumn : 0);

	const matches = raw.match(reTag);
	const tagWithAttrs = matches?.[1];

	if (!tagWithAttrs) {
		throw new SyntaxError(`Invalid tag syntax: "${raw}"`);
	}

	// eslint-disable-next-line no-control-regex
	const tagNameSplitted = tagWithAttrs.split(/[\u0000\u0009\u000A\u000C />]/);
	const tagName = tagNameSplitted[0] || tagNameSplitted[1];
	if (!tagName || (!reTagName.test(tagName) && !isPotentialCustomElementName(tagName))) {
		throw new SyntaxError(`Invalid tag name: "${tagName}" in <${tagWithAttrs}>`);
	}

	const tagStartPos = tagWithAttrs.indexOf(tagName);
	let rawAttrs = tagWithAttrs.slice(Math.max(0, tagStartPos + tagName.length));

	// console.log({ raw, tagStartPos, tagName, rawAttrs });

	col += tagName.length + 1 + tagStartPos;
	offset += tagName.length + 1 + tagStartPos;

	const attrs: MLASTAttr[] = [];

	while (reAttrsInStartTag.test(rawAttrs)) {
		const attrMatchedMap = rawAttrs.match(reAttrsInStartTag);
		if (attrMatchedMap && attrMatchedMap[0]) {
			const rawAttr = attrMatchedMap[0];
			const attr = attrTokenizer(rawAttr, line, col, offset);
			line = attr.endLine;
			col = attr.endCol;
			offset = attr.endOffset;
			rawAttrs = rawAttrs.slice(rawAttr.length);
			attrs.push(attr);
		}
	}

	const endTokens = reEndTokens.exec(raw);
	const selfClosingSolidus = tokenizer(endTokens?.[1] ?? '', line, col, offset);
	line = selfClosingSolidus.endLine;
	col = selfClosingSolidus.endCol;
	offset = selfClosingSolidus.endOffset;

	const endSpace = tokenizer(endTokens?.[2] ?? '', line, col, offset);

	return {
		tagName,
		attrs,
		selfClosingSolidus,
		endSpace,
	};
}
