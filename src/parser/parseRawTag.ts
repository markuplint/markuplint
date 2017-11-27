export interface RawAttribute {
	name: string;
	value: string | null;
	quote: '"' | "'" | null;
	line: number;
	col: number;
	raw: string;
}

export function parseRawTag (rawStartTag: string) {
	// const denyAttrNameCharactersRegExp = /[ "'>\/=\uFDD0-\uFDEF\uFFFF]/;
	const matches = rawStartTag.match(/<([^>]+)>/);
	if (!matches) {
		throw new Error();
	}
	const tagWithAttrs = matches[1];
	if (!tagWithAttrs) {
		throw new Error();
	}

	// TODO: fix easy spliting...😆
	const [tagName, ...rawAttrs] = tagWithAttrs.trim().split(/\s+/).map(node => node.trim());

	let shavedOffset = tagName.length + 1; // +1 is "<" character.
	let shavedTag = tagWithAttrs.substring(tagName.length);
	const attrs: RawAttribute[] = [];
	for (const rawAttr of rawAttrs) {
		console.log({shavedTag});
		const attrIndex = shavedTag.indexOf(rawAttr);
		shavedOffset += attrIndex;
		shavedTag = shavedTag.substring(attrIndex + rawAttr.length);
		console.log('->', {shavedTag});
		// console.log({ tagWithAttrs, shavedTag, shavedOffset });
		const line = 0;
		const col = shavedOffset;
		const nameAndValue = rawAttr.split('=');
		const name = nameAndValue[0];
		if (!name) {
			throw new Error('Expected unreachable code');
		}
		let value: string | null = null;
		let quote: '"' | "'" | null = null;
		const valueWithQuote = nameAndValue[1] || null;
		if (valueWithQuote) {
			const valueWithQuoteMatches = valueWithQuote.match(/^("|')?(.+)\1$/);
			if (!valueWithQuoteMatches) {
				throw new Error();
			}
			value = valueWithQuoteMatches[2] || null; // tslint:disable-line:no-magic-numbers
			const _quote = valueWithQuoteMatches[1];
			switch (_quote) {
				case '"':
				case "'":
					quote = _quote;
			}
		}
		attrs.push({
			name,
			value,
			quote,
			line,
			col,
			raw: rawAttr,
		});
	}
	return {
		tagName,
		attrs,
	};
}
