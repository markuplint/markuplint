import {
	rePCEN,
	reStartTag,
	reTagName,
} from './const';

const reAttrsInStartTag = /\s*[^\x00-\x1f\x7f-\x9f "'>\/=]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s]*))?/;

import Attribute from '../attribute';

export default function parseRawTag (raw: string, nodeLine: number, nodeCol: number, startOffset: number) {
	let line = nodeLine;
	let col = nodeCol;
	let offset = startOffset;

	// console.log({raw});

	const matches = raw.match(reStartTag);
	if (!matches) {
		throw new SyntaxError(`Invalid tag syntax: ${raw}`);
	}
	const tagWithAttrs = matches[1];

	const tagName = tagWithAttrs.split(/\s+/)[0];
	if (!tagName || !reTagName.test(tagName) && !rePCEN.test(tagName)) {
		throw new SyntaxError(`Invalid tag name: "${tagName}" in <${tagWithAttrs}>`);
	}
	let rawAttrs = tagWithAttrs.substring(tagName.length);

	col += tagName.length + 1;
	offset += tagName.length + 1;

	const attrs: Attribute[] = [];

	while (reAttrsInStartTag.test(rawAttrs)) {
		const attrMatchedMap = rawAttrs.match(reAttrsInStartTag);
		if (attrMatchedMap && attrMatchedMap[0]) {
			const rawAttr = attrMatchedMap[0];
			const attr = new Attribute(rawAttr, line, col, offset);
			line = attr.location.endLine;
			col = attr.location.endCol;
			offset = attr.location.endOffset;
			rawAttrs = rawAttrs.substr(rawAttr.length);
			attrs.push(attr);
		}
	}

	return {
		tagName,
		attrs,
		// tslint:disable-next-line:only-arrow-functions object-literal-shorthand
		toJSON: function () {
			return {
				// tslint:disable-next-line:no-invalid-this
				tagName: this.tagName,
				// tslint:disable-next-line:no-invalid-this
				attrs: this.attrs.map(attr => attr.toJSON()),
			};
		},
	};
}
