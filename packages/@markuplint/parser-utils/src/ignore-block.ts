import type { Code, IgnoreBlock, IgnoreTag } from './types.js';
import type { MLASTNode, MLASTPreprocessorSpecificBlock } from '@markuplint/ml-ast';

import { MASK_CHAR } from './const.js';
import { uuid } from './create-token.js';
import { getCol, getLine } from './get-location.js';
import { ParserError } from './parser-error.js';

export function ignoreBlock(source: string, tags: readonly IgnoreTag[], maskChar = MASK_CHAR): IgnoreBlock {
	let replaced = source;
	const stack: Code[] = [];
	for (const tag of tags) {
		const text = maskText(tag.start, tag.end, replaced, (startTag, taggedCode, endTag) => {
			const mask =
				maskChar.repeat(startTag.length) +
				taggedCode.replaceAll(/[^\n]/g, maskChar) +
				maskChar.repeat((endTag ?? '').length);
			const taggedMask = `<!${mask.slice(2).slice(0, -1)}>`;
			return taggedMask;
		});
		replaced = text.replaced;
		stack.push(...text.stack.map(res => ({ ...res, type: tag.type })));
	}
	stack.sort((a, b) => a.index - b.index);

	return {
		source,
		replaced,
		stack,
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
	nodeList: MLASTNode[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ignoreBlock: IgnoreBlock,
	throwErrorWhenTagHasUnresolved = true,
) {
	nodeList = [...nodeList];
	const { source, stack, maskChar } = ignoreBlock;

	for (const tag of stack) {
		const node = nodeList.find(node => node.startOffset === tag.index);

		if (!node) {
			continue;
		}

		const psNode: MLASTPreprocessorSpecificBlock = {
			uuid: uuid(),
			type: 'psblock',
			nodeName: `#ps:${tag.type}`,
			raw: `${tag.startTag}${tag.taggedCode}${tag.endTag ?? ''}`,
			parentNode: node.parentNode,
			prevNode: null,
			nextNode: null,
			isFragment: node.isFragment,
			isGhost: false,
			startOffset: node.startOffset,
			endOffset: node.endOffset,
			startLine: node.startLine,
			endLine: node.endLine,
			startCol: node.startCol,
			endCol: node.endCol,
		};

		if (node.prevNode?.nextNode) {
			node.prevNode.nextNode = psNode;
		}
		if (node.nextNode?.prevNode) {
			node.nextNode.prevNode = psNode;
		}
		if (node.parentNode?.childNodes) {
			const index = node.parentNode.childNodes.indexOf(node);
			node.parentNode.childNodes.splice(index, 1, psNode);
		}

		const index = nodeList.indexOf(node);
		nodeList.splice(index, 1, psNode);

		tag.resolved = true;
	}

	for (const node of nodeList) {
		if (node.type === 'starttag') {
			for (const attr of node.attributes) {
				if (attr.type === 'ps-attr' || attr.value.raw === '' || !hasIgnoreBlock(attr.value.raw, maskChar)) {
					continue;
				}
				for (const tag of stack) {
					const raw = tag.startTag + tag.taggedCode + tag.endTag;
					const length = raw.length;

					if (attr.value.startOffset <= tag.index && tag.index + length <= attr.value.endOffset) {
						const offset = tag.index - attr.value.startOffset;
						const above = attr.value.raw.slice(0, offset);
						const below = attr.value.raw.slice(offset + length);
						attr.value.raw = above + raw + below;
						attr.isDynamicValue = true;
						tag.resolved = true;
					}

					attr.raw =
						attr.spacesBeforeName.raw +
						attr.name.raw +
						attr.spacesBeforeEqual.raw +
						attr.equal.raw +
						attr.spacesAfterEqual.raw +
						attr.startQuote.raw +
						attr.value.raw +
						attr.endQuote.raw;
				}

				// Update node raw
				const length = attr.raw.length;
				const offset = attr.startOffset - node.startOffset - attr.spacesBeforeName.raw.length;
				const above = node.raw.slice(0, offset);
				const below = node.raw.slice(offset + length);
				node.raw = above + attr.raw + below;
			}
		}
	}

	if (throwErrorWhenTagHasUnresolved) {
		for (const tag of stack) {
			if (!tag.resolved) {
				throw new ParserError('Parsing failed. Unsupported syntax detected', {
					line: getLine(source, tag.index),
					col: getCol(source, tag.index),
					raw: tag.startTag + tag.taggedCode + (tag.endTag ?? ''),
				});
			}
		}
	}

	return nodeList;
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
