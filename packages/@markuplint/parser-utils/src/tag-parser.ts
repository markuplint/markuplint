import type { MLASTAttr } from '@markuplint/ml-ast';

import { attrTokenizer as defaultAttrTokenizer } from './attr-tokenizer.js';
import { defaultSpaces } from './const.js';
import { tokenizer } from './create-token.js';

enum TagState {
	BeforeOpenTag,
	FirstCharOfTagName,
	TagName,
	Attrs,
	AfterAttrs,
	AfterOpenTag,
}

export function tagParser(
	raw: string,
	startLine: number,
	startCol: number,
	startOffset: number,
	offsetOffset = 0,
	offsetLine = 0,
	offsetColumn = 0,
	spaces: ReadonlyArray<string> = defaultSpaces,
	attrTokenizer = defaultAttrTokenizer,
) {
	let offset = startOffset + offsetOffset;
	let line = startLine + offsetLine;
	let col = startCol + (startLine === 1 ? offsetColumn : 0);

	let state: TagState = TagState.BeforeOpenTag;
	let beforeOpenTagChars = '';
	let tagName = '';
	let afterAttrsSpaceChars = '';
	let selfClosingSolidusChar = '';
	let isOpenTag = true;
	const attrs: MLASTAttr[] = [];

	const chars = [...raw];
	while (chars.length > 0) {
		if (state === TagState.AfterOpenTag) {
			break;
		}

		const char = chars.shift()!;

		stateSwitch: switch (state) {
			case TagState.BeforeOpenTag: {
				if (char === '<') {
					const beforeOpenTag = tokenizer(beforeOpenTagChars, line, col, offset);
					line = beforeOpenTag.endLine;
					col = beforeOpenTag.endCol;
					offset = beforeOpenTag.endOffset;
					// Add `<` length
					col += 1;
					offset += 1;
					state = TagState.FirstCharOfTagName;
					break;
				}
				beforeOpenTagChars += char;
				break;
			}
			case TagState.FirstCharOfTagName: {
				if (/[a-z]/i.test(char)) {
					tagName += char;
					state = TagState.TagName;
					break;
				}
				if (char === '/') {
					isOpenTag = false;
					break;
				}
				chars.unshift(char);
				state = TagState.AfterOpenTag;
				break;
			}
			case TagState.TagName: {
				if (spaces.includes(char)) {
					chars.unshift(char);
					if (!isOpenTag) {
						// Add `/` of `</`(close tag) length
						offset += 1;
						col += 1;
					}
					offset += tagName.length;
					col += tagName.length;
					state = TagState.Attrs;
					break;
				}

				if (char === '/') {
					chars.unshift(char);
					state = TagState.AfterAttrs;
					break;
				}

				if (char === '>') {
					state = TagState.AfterOpenTag;
					break;
				}

				tagName += char;
				break;
			}
			case TagState.Attrs: {
				let leftover = char + chars.join('');

				while (leftover.trim()) {
					if (leftover.trim().startsWith('/') || leftover.trim().startsWith('>')) {
						chars.length = 0;
						chars.push(...leftover);
						state = TagState.AfterAttrs;
						break stateSwitch;
					}

					const attr = attrTokenizer(leftover, line, col, offset);

					line = attr.endLine;
					col = attr.endCol;
					offset = attr.endOffset;

					if (leftover === attr.__leftover) {
						throw new SyntaxError(`Invalid attribute syntax: ${leftover}`);
					}

					leftover = attr.__leftover ?? '';

					delete attr.__leftover;

					attrs.push(attr);
				}

				break;
			}
			case TagState.AfterAttrs: {
				if (char === '>') {
					state = TagState.AfterOpenTag;
					break;
				}

				if (spaces.includes(char)) {
					afterAttrsSpaceChars += char;
					break;
				}

				if (char === '/') {
					selfClosingSolidusChar = char;
					break;
				}

				throw new SyntaxError(`Invalid tag syntax: "${raw}"`);
			}
		}
	}

	const leftover = chars.join('');

	if ((!leftover && state === TagState.TagName) || tagName === '') {
		throw new SyntaxError(`Invalid tag syntax: "${raw}"`);
	}

	// console.log({
	// 	state,
	// 	leftover,
	// 	afterAttrsSpaceChars,
	// 	selfClosingSolidusChar,
	// 	attrs: attrs.map(a => a.raw),
	// });

	const afterAttrSpaces = tokenizer(afterAttrsSpaceChars, line, col, offset);
	line = afterAttrSpaces.endLine;
	col = afterAttrSpaces.endCol;
	offset = afterAttrSpaces.endOffset;

	const selfClosingSolidus = tokenizer(selfClosingSolidusChar, line, col, offset);
	line = selfClosingSolidus.endLine;
	col = selfClosingSolidus.endCol;
	offset = selfClosingSolidus.endOffset;

	return {
		beforeOpenTag: beforeOpenTagChars,
		tagName,
		attrs,
		afterAttrSpaces,
		selfClosingSolidus,
		isOpenTag,
		leftover,
	};
}
