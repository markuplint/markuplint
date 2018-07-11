import { MLASTAttr } from '@markuplint/ml-ast/';

import attrTokenizer from './attr-tokenizer';
import { rePCEN, reTag, reTagName } from './const';

const reAttrsInStartTag = /\s*[^\x00-\x1f\x7f-\x9f "'>\/=]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s]*))?/;

export default function parseRawTag(raw: string, nodeLine: number, nodeCol: number, startOffset: number) {
	let line = nodeLine;
	let col = nodeCol;
	let offset = startOffset;

	const matches = raw.match(reTag);
	if (!matches) {
		throw new SyntaxError(`Invalid tag syntax: ${raw}`);
	}
	const tagWithAttrs = matches[1];

	const tagNameSplited = tagWithAttrs.split(/[\u0000\u0009\u000A\u000C\u0020\/>]/);
	const tagName = tagNameSplited[0] || tagNameSplited[1];
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
