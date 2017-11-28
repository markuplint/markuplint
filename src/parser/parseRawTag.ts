export interface RawAttribute {
	name: string;
	value: string | null;
	quote: '"' | "'" | null;
	line: number;
	col: number;
	raw: string;
}

export function parseRawTag (rawStartTag: string) {
	let line = 0;
	let col = 0;

	const matches = rawStartTag.match(/<([^>]+)>/);
	if (!matches) {
		throw new SyntaxError('Invalid tag syntax');
	}
	const tagWithAttrs = matches[1];
	if (!tagWithAttrs) {
		throw new SyntaxError('Invalid tag syntax');
	}

	// HTML Standard elements /^[a-z]+/
	// HTML Custom elements /^[a-z]+(-[a-z]+)+/
	// Namespaced element /^[a-z]+:[a-z]+/
	const tagNameMatches = tagWithAttrs.match(/^(?:[a-z]+:)?[a-z]+(?:-[a-z]+)*/i);
	if (!tagNameMatches) {
		throw new SyntaxError('Invalid tag name');
	}
	const tagName = tagNameMatches[0];
	let attrString = tagWithAttrs.substring(tagName.length);

	// console.log({ tagName, attrString});

	col += tagName.length + 1;

	const regAttr = /([^\x00-\x1f\x7f-\x9f "'>\/=]+)(?:\s*=\s*(?:("|')([^\2]*)\2|([^ "'=<>`]+)))?/;
	const attrs: RawAttribute[] = [];

	while (regAttr.test(attrString)) {
		const attrMatchedMap = attrString.match(regAttr);
		if (attrMatchedMap) {
			const raw = attrMatchedMap[0];
			const name = attrMatchedMap[1];
			const quote = (attrMatchedMap[2] as '"' | "'" | void) || null;
			const value = (quote ? attrMatchedMap[3] : attrMatchedMap[4]) || null;
			const index = attrMatchedMap.index || 0;
			col += index;

			// console.log(rawStartTag);
			// console.log(`${'_'.repeat(col)}${raw}`);
			// console.log({ name, quote, value, col });

			attrs.push({
				name,
				value,
				quote,
				line,
				col,
				raw,
			});

			attrString = attrString.substring(raw.length + index);

			col += raw.length;
		}
	}
	return {
		tagName,
		attrs,
	};
}
