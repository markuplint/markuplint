import type { Parser } from './parser.js';
import type { Code, IgnoreBlock, IgnoreTag } from './types.js';
import type {
	MLASTAttr,
	MLASTNodeTreeItem,
	MLASTPreprocessorSpecificBlock,
	MLASTSpreadAttr,
	MLASTText,
} from '@markuplint/ml-ast';

import { MASK_CHAR } from './const.js';
import { getPosition } from './get-location.js';
import { ParserError } from './parser-error.js';

/**
 * Masks the source regions that match the given tag patterns so that
 * template expressions do not interfere with HTML tokenization.
 *
 * A block is masked in one of two forms. In content it is wrapped as a bogus comment (`<!…>`), which the HTML
 * tokenizer takes as one node. In a start tag, outside a quoted value, it is the characters of a name or of an
 * unquoted value, as the `>` of a bogus comment would end the tag there and leave the attributes after it as
 * text; `restoreNode` makes such a name a spread attribute.
 *
 * Invariant: the masked output must keep exactly the same character count
 * and line breaks as the original source — `restoreNode` and all position
 * reporting depend on offsets and line numbers in the masked code matching
 * the original.
 */
export function ignoreBlock(source: string, tags: readonly IgnoreTag[], maskChar = MASK_CHAR): IgnoreBlock {
	let replaced = source;
	const stack: Code[] = [];
	// First every block of every pattern is masked as characters of a name, so that no `>` of a block that is
	// masked later ends a tag that is read before it
	for (const tag of tags) {
		const text = maskText(
			tag.start,
			tag.end,
			replaced,
			(startTag, taggedCode, endTag) =>
				maskChar.repeat(startTag.length) +
				taggedCode.replaceAll(/[^\n]/g, maskChar) +
				maskChar.repeat((endTag ?? '').length),
		);
		replaced = text.replaced;
		stack.push(...text.stack.map(res => ({ ...res, type: tag.type })));
	}
	const sorted = stack.toSorted((a, b) => a.index - b.index);

	// Then one scan of the code tells where each block is. In a start tag, outside a quoted value, a block stands
	// for attributes (`<div <?= $attrs ?>>`) or a part of one (`<div id=<?= $id ?>>`) and stays the characters of
	// a name or an unquoted value; `restoreNode` makes a name that it is in a spread attribute. Anywhere else it is
	// wrapped in `<!` ... `>` (bogus comment syntax) so the HTML tokenizer consumes the masked region as a single
	// bogus comment node instead of interpreting it as text or markup. The slices drop three mask characters to
	// compensate for the three wrapper characters, preserving the total length.
	// The scan reads the code as it was before this step: a block that becomes a bogus comment is no tag either way
	const scanner = new StartTagScanner();
	const pieces: string[] = [];
	let copied = 0;
	for (const block of sorted) {
		const length = block.startTag.length + block.taggedCode.length + (block.endTag ?? '').length;
		if (scanner.isInStartTagAt(replaced, block.index) && closesTag(replaced, block.index + length)) {
			continue;
		}
		const mask = replaced.slice(block.index, block.index + length);
		pieces.push(replaced.slice(copied, block.index), `<!${mask.slice(2).slice(0, -1)}>`);
		copied = block.index + length;
	}
	pieces.push(replaced.slice(copied));
	replaced = pieces.join('');

	return {
		source,
		replaced,
		stack: sorted,
		maskChar,
	};
}

function maskText(
	start: Readonly<RegExp> | string,
	end: Readonly<RegExp> | string,
	replaced: string,
	masking: (startTag: string, taggedCode: string, endTag?: string) => string,
) {
	const stack: Omit<Code, 'type'>[] = [];
	start = removeGlobalOption(start);
	end = removeGlobalOption(end);
	while (start.test(replaced)) {
		const [index, above, startTag, _below] = snap(replaced, start);
		if (!startTag || !_below) {
			continue;
		}
		const [, taggedCode, endTag, below] = snap(_below, end);
		stack.push({
			index,
			startTag,
			taggedCode,
			endTag: endTag ?? null,
			resolved: false,
		});
		/**
		 * It will not replace line breaks because detects line number.
		 */
		replaced = above + masking(startTag, taggedCode, endTag) + (below ?? '');
	}
	return {
		replaced,
		stack,
	};
}

export function restoreNode(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parser: Parser<any, any>,
	nodeList: readonly MLASTNodeTreeItem[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ignoreBlock: IgnoreBlock,
	throwErrorWhenTagHasUnresolved = true,
) {
	const newNodeList = [...nodeList];
	const { source, stack, maskChar } = ignoreBlock;

	if (stack.length === 0) {
		return newNodeList;
	}

	for (const tag of stack) {
		const raw = `${tag.startTag}${tag.taggedCode}${tag.endTag ?? ''}`;
		const tagIndexEnd = tag.index + raw.length;

		const nodeEndOffset = (n: MLASTNodeTreeItem) => n.offset + n.raw.length;
		const node = newNodeList.find(node => node.offset <= tag.index && nodeEndOffset(node) >= tagIndexEnd);

		if (!node) {
			continue;
		}

		const replacementChildNodes: (MLASTText | MLASTPreprocessorSpecificBlock)[] = [];

		if (node.offset === tag.index && nodeEndOffset(node) === tagIndexEnd) {
			const token = parser.createToken(raw, node.offset, node.line, node.col);

			const psNode: MLASTPreprocessorSpecificBlock = {
				...token,
				type: 'psblock',
				depth: node.depth,
				nodeName: `#ps:${tag.type}`,
				parentNodeUuid: node.parentNode?.uuid ?? null,
				parentNode: node.parentNode,
				childNodes: [],
				blockBehavior: null,
				isBogus: false,
				isFragment: false, // Whether this block is a fragment depends on the preprocessor directive type, but defaults to false as a safe assumption for ignore-block replacements.
			};

			replacementChildNodes.push(psNode);
		} else if (node.type === 'text') {
			const offset = tag.index - node.offset;
			const above = node.raw.slice(0, offset);
			const below = node.raw.slice(offset + raw.length);

			if (above) {
				const { line, column } = getPosition(node.raw, 0);
				const token = parser.createToken(above, node.offset, node.line + line - 1, node.col + column - 1);

				const aboveNode: MLASTText = {
					...token,
					nodeName: '#text',
					type: 'text',
					parentNodeUuid: node.parentNode?.uuid ?? null,
					parentNode: node.parentNode,
					depth: node.depth,
				};

				replacementChildNodes.push(aboveNode);
			}

			const { line, column } = getPosition(raw, offset);
			const token = parser.createToken(raw, node.offset + offset, node.line + line - 1, node.col + column - 1);

			const psNode: MLASTPreprocessorSpecificBlock = {
				...token,
				type: 'psblock',
				depth: node.depth,
				nodeName: `#ps:${tag.type}`,
				parentNodeUuid: node.parentNode?.uuid ?? null,
				parentNode: node.parentNode,
				childNodes: [],
				blockBehavior: null,
				isBogus: false,
				isFragment: false, // Whether this block is a fragment depends on the preprocessor directive type, but defaults to false as a safe assumption for ignore-block replacements.
			};
			replacementChildNodes.push(psNode);

			if (below) {
				const { line, column } = getPosition(node.raw, offset + raw.length);
				const token = parser.createToken(
					below,
					node.offset + offset + raw.length,
					node.line + line - 1,
					node.col + column - 1,
				);

				const aboveNode: MLASTText = {
					...token,
					nodeName: '#text',
					type: 'text',
					parentNodeUuid: node.parentNode?.uuid ?? null,
					parentNode: node.parentNode,
					depth: node.depth,
				};

				replacementChildNodes.push(aboveNode);
			}
		}

		if (replacementChildNodes.length > 0) {
			if (node.type !== 'doctype' && node.parentNode?.childNodes) {
				parser.replaceChild(node.parentNode, node, ...replacementChildNodes);
			}

			const index = newNodeList.indexOf(node);
			newNodeList.splice(index, 1, ...replacementChildNodes);

			tag.resolved = true;
		}
	}

	for (const node of newNodeList) {
		if (node.type === 'starttag') {
			// A block in the place of a name stands for attributes that the markup does not show, as a spread does
			const attributes = restoreBlocksInNames(parser, node.attributes, ignoreBlock);
			if (attributes !== node.attributes) {
				// The code of the blocks in the place of a name, a comment too, is put back in the raw of the tag
				for (const attr of node.attributes) {
					if (attr.type !== 'spread' && hasIgnoreBlock(attr.name.raw, maskChar)) {
						const offset = attr.offset - node.offset;
						const code = source.slice(attr.offset, attr.offset + attr.raw.length);
						parser.updateRaw(node, node.raw.slice(0, offset) + code + node.raw.slice(offset + code.length));
					}
				}
				Object.assign(node, { attributes });
			}
			for (const attr of node.attributes) {
				if (attr.type === 'spread' || attr.value.raw === '' || !hasIgnoreBlock(attr.value.raw, maskChar)) {
					continue;
				}
				for (const tag of stack) {
					const raw = tag.startTag + tag.taggedCode + tag.endTag;
					const length = raw.length;

					if (
						attr.value.offset <= tag.index &&
						tag.index + length <= attr.value.offset + attr.value.raw.length
					) {
						const offset = tag.index - attr.value.offset;
						const above = attr.value.raw.slice(0, offset);
						const below = attr.value.raw.slice(offset + length);
						parser.updateRaw(attr.value, above + raw + below);
						parser.updateAttr(attr, { isDynamicValue: true });
						tag.resolved = true;
					}

					parser.updateRaw(
						attr,
						attr.name.raw +
							attr.spacesBeforeEqual.raw +
							attr.equal.raw +
							attr.spacesAfterEqual.raw +
							attr.startQuote.raw +
							attr.value.raw +
							attr.endQuote.raw,
					);
				}

				const length = attr.raw.length;
				const offset = attr.offset - node.offset;
				const above = node.raw.slice(0, offset);
				const below = node.raw.slice(offset + length);
				parser.updateRaw(node, above + attr.raw + below);
			}
		}
	}

	if (throwErrorWhenTagHasUnresolved) {
		for (const tag of stack) {
			if (!tag.resolved) {
				const { line, column } = getPosition(source, tag.index);
				throw new ParserError('Parsing failed. Unsupported syntax detected', {
					line,
					col: column,
					raw: tag.startTag + tag.taggedCode + (tag.endTag ?? ''),
				});
			}
		}
	}

	return newNodeList;
}

/**
 * The attributes with the blocks of the template language in the place of a name restored: a block that gives
 * the element attributes, or a name, that the markup does not show is a spread attribute, and a comment of the
 * template language, which renders nothing, is no attribute. The attributes that one block covers (a block that has
 * a line break in it is two names to the tokenizer) are one. The blocks are resolved.
 *
 * @param parser - The parser
 * @param attributes - The attributes of a start tag
 * @param ignoreBlock - The masked blocks
 * @returns The attributes, or the same array when no name has a block
 */
function restoreBlocksInNames(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parser: Parser<any, any>,
	attributes: readonly MLASTAttr[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ignoreBlock: IgnoreBlock,
): readonly MLASTAttr[] {
	const end = (attr: MLASTAttr) => attr.offset + attr.raw.length;
	const blockEnd = (tag: Code) => tag.index + tag.startTag.length + tag.taggedCode.length + (tag.endTag ?? '').length;
	const blocksOf = (attr: MLASTAttr) =>
		ignoreBlock.stack.filter(tag => tag.index < end(attr) && blockEnd(tag) > attr.offset);

	if (!attributes.some(attr => attr.type !== 'spread' && hasIgnoreBlock(attr.name.raw, ignoreBlock.maskChar))) {
		return attributes;
	}

	const result: MLASTAttr[] = [];
	let index = 0;
	while (index < attributes.length) {
		const attr = attributes[index]!;
		// A block in an unquoted value that has a line break in it is the rest of the value, which the tokenizer
		// took for names: the value holds the whole block
		if (
			attr.type !== 'spread' &&
			attr.startQuote.raw === '' &&
			hasIgnoreBlock(attr.value.raw, ignoreBlock.maskChar) &&
			!hasIgnoreBlock(attr.name.raw, ignoreBlock.maskChar)
		) {
			const valueEnd = Math.max(end(attr), ...blocksOf(attr).map(blockEnd));
			let next = index + 1;
			while (next < attributes.length && attributes[next]!.offset < valueEnd) {
				next++;
			}
			if (next > index + 1) {
				const raw = ignoreBlock.replaced.slice(attr.offset, valueEnd);
				result.push({
					...attr,
					raw,
					value: { ...attr.value, raw: ignoreBlock.replaced.slice(attr.value.offset, valueEnd) },
				});
				index = next;
				continue;
			}
		}
		if (attr.type === 'spread' || !hasIgnoreBlock(attr.name.raw, ignoreBlock.maskChar)) {
			result.push(attr);
			index++;
			continue;
		}
		// The attributes that the blocks of this one reach
		const group: MLASTAttr[] = [attr];
		let blocks = blocksOf(attr);
		let groupEnd = Math.max(end(attr), ...blocks.map(blockEnd));
		while (index + group.length < attributes.length && attributes[index + group.length]!.offset < groupEnd) {
			const next = attributes[index + group.length]!;
			group.push(next);
			blocks = [...new Set([...blocks, ...blocksOf(next)])];
			groupEnd = Math.max(groupEnd, end(next), ...blocks.map(blockEnd));
		}
		index += group.length;
		for (const tag of blocks) {
			tag.resolved = true;
		}
		const raw = ignoreBlock.source.slice(attr.offset, groupEnd);
		// A comment of the template language renders nothing
		let rest = raw;
		for (const tag of blocks) {
			rest = rest.replace(tag.startTag + tag.taggedCode + (tag.endTag ?? ''), '');
		}
		if (blocks.length > 0 && blocks.every(tag => tag.type.endsWith('-comment')) && rest.trim() === '') {
			continue;
		}
		const spread: MLASTSpreadAttr = {
			...parser.createToken(raw, attr.offset, attr.line, attr.col),
			type: 'spread',
			nodeName: '#spread',
		};
		result.push(spread);
	}
	return result;
}

/**
 * Whether a position of a code is in a start tag and not in a quoted value of an attribute, read as the tokenizer of
 * HTML reads tags: a `<` and a letter open a tag, which a `>` closes outside quotes. A comment, a bogus comment
 * (`<!…>`, `<?…>`) and the content of `script` and `style` are skipped. The content of the other elements of raw text
 * and of escapable raw text (`textarea`, `title`, `xmp`, `iframe`, `noembed`, `noframes`) is not: a `<` and a letter
 * in it are taken for a tag (see {@link closesTag}, which keeps a block there a bogus comment when no `>` closes it).
 * A position in the name of a tag (`<div<?= $a ?>>`) is not in a place of an attribute.
 *
 * It scans a code once: each call goes on from where the one before stopped, as the blocks are asked about in the
 * order of the code, and what is before the position does not change after it is asked about.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
 */
class StartTagScanner {
	#pos = 0;
	#state: 'data' | 'tag-name' | 'tag' | 'dq' | 'sq' | 'comment' | 'bogus' | 'raw-text' = 'data';
	#rawTextEnd = '';
	#lastInTag = '';

	/**
	 * @param code - The code; the part before the position the call before was given does not change
	 * @param position - The offset of a block, not before the one of the call before
	 * @returns `true` if a block there is in the place of an attribute
	 */
	isInStartTagAt(code: string, position: number): boolean {
		let i = this.#pos;
		while (i < position) {
			const char = code[i]!;
			switch (this.#state) {
				case 'data': {
					if (code.startsWith('<!--', i)) {
						this.#state = 'comment';
						i += 4;
						continue;
					}
					if (char === '<' && (code[i + 1] === '!' || code[i + 1] === '?')) {
						this.#state = 'bogus';
						i += 2;
						continue;
					}
					if (char === '<' && /[A-Z]/i.test(code[i + 1] ?? '')) {
						const name = /^[A-Z][^\t\n\f\r />]*/i.exec(code.slice(i + 1, i + 65))?.[0].toLowerCase() ?? '';
						this.#rawTextEnd = name === 'script' || name === 'style' ? `</${name}` : '';
						this.#state = 'tag-name';
						this.#lastInTag = '';
						i++;
						continue;
					}
					break;
				}
				case 'tag-name': {
					if (/[\t\n\f\r /]/.test(char)) {
						this.#state = 'tag';
					} else if (char === '>') {
						this.#state = this.#rawTextEnd ? 'raw-text' : 'data';
					}
					break;
				}
				case 'tag': {
					if (char === '>') {
						this.#state = this.#rawTextEnd ? 'raw-text' : 'data';
					} else if ((char === '"' || char === "'") && this.#lastInTag === '=') {
						this.#state = char === '"' ? 'dq' : 'sq';
					}
					if (!/[\t\n\f\r ]/.test(char)) {
						this.#lastInTag = char;
					}
					break;
				}
				case 'dq':
				case 'sq': {
					if (char === (this.#state === 'dq' ? '"' : "'")) {
						this.#state = 'tag';
						this.#lastInTag = char;
					}
					break;
				}
				case 'comment': {
					if (code.startsWith('-->', i)) {
						this.#state = 'data';
						i += 3;
						continue;
					}
					break;
				}
				case 'bogus': {
					if (char === '>') {
						this.#state = 'data';
					}
					break;
				}
				case 'raw-text': {
					if (char === '<' && code.slice(i, i + this.#rawTextEnd.length).toLowerCase() === this.#rawTextEnd) {
						this.#state = 'tag-name';
						this.#rawTextEnd = '';
						i += 2;
						continue;
					}
					break;
				}
			}
			i++;
		}
		this.#pos = Math.max(i, this.#pos);
		return this.#state === 'tag';
	}
}

/**
 * Whether a `>` closes the start tag after a position before another tag opens: a block in what only looks like a
 * tag (`<p>a<b <?= $a ?></p>`, a `<` and a letter in text) is left a bogus comment, as it was.
 *
 * @param code - The masked code
 * @param from - The offset after a block
 * @returns `true` if the tag closes
 */
function closesTag(code: string, from: number): boolean {
	let quote: '"' | "'" | null = null;
	let last = '';
	for (let i = from; i < code.length; i++) {
		const char = code[i]!;
		if (quote) {
			if (char === quote) {
				quote = null;
				last = char;
			}
			continue;
		}
		if (char === '>') {
			return true;
		}
		if (char === '<') {
			return false;
		}
		if ((char === '"' || char === "'") && last === '=') {
			quote = char;
		}
		if (!/[\t\n\f\r ]/.test(char)) {
			last = char;
		}
	}
	return false;
}

function snap(str: string, reg: Readonly<RegExp>): [number, string] | [number, string, string, string] {
	const matched = reg.exec(str);
	if (!matched) {
		return [-1, str];
	}
	const index = matched.index;
	const snapPoint = matched[0];
	const above = str.slice(0, index);
	const below = str.slice(index).slice(snapPoint.length);
	return [index, above, snapPoint, below];
}

function removeGlobalOption(reg: Readonly<RegExp> | string) {
	if (typeof reg === 'string') {
		return new RegExp(escapeRegExpForStr(reg));
	}
	return new RegExp(reg.source, reg.ignoreCase ? 'i' : '');
}

function hasIgnoreBlock(textContent: string, maskChar: string) {
	return textContent.includes(maskChar);
}

function escapeRegExpForStr(str: string) {
	return str.replaceAll(/[!$()*+./:=?[\\\]^{|}]/g, '\\$&');
}
