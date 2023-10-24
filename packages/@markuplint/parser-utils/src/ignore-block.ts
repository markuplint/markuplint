import type { Code, IgnoreBlock, IgnoreTag } from './types.js';
import type { MLASTNode, MLASTPreprocessorSpecificBlock, MLASTText } from '@markuplint/ml-ast';

import { MASK_CHAR } from './const.js';
import { uuid } from './create-token.js';
import { sliceFragment } from './get-location.js';
import { siblingsCorrection } from './siblings-correction.js';

export function ignoreBlock(source: string, tags: readonly IgnoreTag[], maskChar = MASK_CHAR): IgnoreBlock {
	let replaced = source;
	const stack: Code[] = [];
	for (const tag of tags) {
		// Replace tags in attributes
		const attr = maskText(
			prepend(tag.start, '(?<=(?:"|\'))'),
			append(tag.end, '(?=(?:"|\'))'),
			replaced,
			(startTag, taggedCode, endTag) => {
				const mask =
					maskChar.repeat(startTag.length) +
					taggedCode.replaceAll(/[^\n]/g, maskChar) +
					maskChar.repeat((endTag ?? '').length);
				return mask;
			},
		);
		replaced = attr.replaced;
		stack.push(...attr.stack.map(res => ({ ...res, type: tag.type })));

		// Replace tags in other nodes
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
	ignoreBlock: IgnoreBlock,
) {
	nodeList = [...nodeList];
	const { source, stack, maskChar } = ignoreBlock;
	for (const node of nodeList) {
		if (node.type === 'comment' || node.type === 'text' || node.type === 'psblock') {
			if (!hasIgnoreBlock(node.raw, maskChar)) {
				continue;
			}
			const parentNode = node.parentNode;
			const index = nodeList.indexOf(node);
			const insertList: (MLASTText | MLASTPreprocessorSpecificBlock)[] = [];
			let text = node.raw;
			let pointer = 0;
			for (const tag of stack) {
				if (node.startOffset <= tag.index && tag.index < node.endOffset) {
					const start = tag.index - node.startOffset;
					const body = tag.startTag + tag.taggedCode + (tag.endTag ?? '');
					const above = node.raw.slice(pointer, start);
					const below = text.slice(above.length + body.length);
					if (above) {
						const offset = node.startOffset + pointer;
						const { raw, startOffset, endOffset, startLine, endLine, startCol, endCol } = sliceFragment(
							source,
							offset,
							offset + above.length,
						);
						const textNode: MLASTText = {
							...node,
							uuid: uuid(),
							type: 'text',
							raw,
							startOffset,
							endOffset,
							startLine,
							endLine,
							startCol,
							endCol,
						};
						if (node.prevNode?.nextNode) {
							node.prevNode.nextNode = textNode;
						}
						if (node.nextNode?.prevNode) {
							node.nextNode.prevNode = textNode;
						}
						insertList.push(textNode);
					}
					if (body) {
						const offset = node.startOffset + pointer + above.length;
						const { raw, startOffset, endOffset, startLine, endLine, startCol, endCol } = sliceFragment(
							source,
							offset,
							offset + body.length,
						);
						const bodyNode: MLASTPreprocessorSpecificBlock = {
							uuid: uuid(),
							type: 'psblock',
							nodeName: `#ps:${tag.type}`,
							raw,
							parentNode: node.parentNode,
							prevNode: null,
							nextNode: null,
							isFragment: node.isFragment,
							isGhost: false,
							startOffset,
							endOffset,
							startLine,
							endLine,
							startCol,
							endCol,
						};
						if (node.prevNode?.nextNode) {
							node.prevNode.nextNode = bodyNode;
						}
						if (node.nextNode?.prevNode) {
							node.nextNode.prevNode = bodyNode;
						}
						insertList.push(bodyNode);
					}
					text = below;
					pointer = start + body.length;
				}
			}
			if (text) {
				const offset = node.endOffset - text.length;
				const { raw, startOffset, endOffset, startLine, endLine, startCol, endCol } = sliceFragment(
					source,
					offset,
					offset + text.length,
				);
				const textNode: MLASTText = {
					...node,
					uuid: uuid(),
					type: 'text',
					raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
				};
				insertList.push(textNode);
			}

			siblingsCorrection(insertList);

			if (parentNode) {
				parentNode.childNodes = insertList;
			}

			nodeList.splice(index, 1, ...insertList);
		}
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
					}
				}
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

function prepend(reg: Readonly<RegExp> | string, str: string) {
	if (typeof reg === 'string') {
		return new RegExp(str + escapeRegExpForStr(reg));
	}
	return new RegExp(str + reg.source, reg.ignoreCase ? 'i' : '');
}

function append(reg: Readonly<RegExp> | string, str: string) {
	if (typeof reg === 'string') {
		return new RegExp(escapeRegExpForStr(reg) + str);
	}
	return new RegExp(reg.source + str, reg.ignoreCase ? 'i' : '');
}

function hasIgnoreBlock(textContent: string, maskChar: string) {
	return textContent.includes(maskChar);
}

function escapeRegExpForStr(str: string) {
	return str.replaceAll(/[!$()*+./:=?[\\\]^{|}]/g, '\\$&');
}
