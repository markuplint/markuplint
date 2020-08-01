import { MLASTAttr, MLToken, tokenizer } from '@markuplint/ml-ast';
import { rePCEN, reTag, reTagName } from './const';
import attrTokenizer from './attr-tokenizer';

// eslint-disable-next-line no-control-regex
const reAttrsInStartTag = /\s*[^\x00-\x1f\x7f-\x9f "'>/=]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s]*))?/;
const reEndTokens = /(\s*\/)?(\s*)>$/;

type TagTokens = {
	tagName: string;
	attrs: MLASTAttr[];
	selfClosingSolidus: MLToken;
	endSpace: MLToken;
};

export default function parseRawTag(
	raw: string,
	nodeLine: number,
	nodeCol: number,
	startOffset: number,
	offsetOffset = 0,
	offsetLine = 0,
	offsetColumn = 0,
): TagTokens {
	let line = nodeLine + offsetLine;
	let col = nodeCol + offsetColumn;
	let offset = startOffset + offsetOffset;

	const matches = raw.match(reTag);
	if (!matches) {
		throw new SyntaxError(`Invalid tag syntax: ${raw}`);
	}
	const tagWithAttrs = matches[1];

	// eslint-disable-next-line no-control-regex
	const tagNameSplited = tagWithAttrs.split(/[\u0000\u0009\u000A\u000C\u0020/>]/);
	const tagName = tagNameSplited[0] || tagNameSplited[1];
	if (!tagName || (!reTagName.test(tagName) && !rePCEN.test(tagName))) {
		throw new SyntaxError(`Invalid tag name: "${tagName}" in <${tagWithAttrs}>`);
	}

	const tagStartPos = tagWithAttrs.indexOf(tagName);
	let rawAttrs = tagWithAttrs.substring(tagStartPos + tagName.length);

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
			rawAttrs = rawAttrs.substr(rawAttr.length);
			attrs.push(attr);
		}
	}

	const endTokens = reEndTokens.exec(raw);
	const selfClosingSolidus = tokenizer(endTokens && endTokens[1], line, col, offset);
	line = selfClosingSolidus.endLine;
	col = selfClosingSolidus.endCol;
	offset = selfClosingSolidus.endOffset;

	const endSpace = tokenizer(endTokens && endTokens[2], line, col, offset);

	return {
		tagName,
		attrs,
		selfClosingSolidus,
		endSpace,
	};
}
