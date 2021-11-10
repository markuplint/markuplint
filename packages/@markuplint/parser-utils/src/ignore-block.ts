import type { Code, IgnoreBlock, IgnoreTag } from './types';
import type { MLASTNode, MLASTPreprocessorSpecificBlock, MLASTText } from '@markuplint/ml-ast';

import { MASK_CHAR } from './const';
import { uuid } from './create-token';
import { sliceFragment } from './get-location';
import { siblingsCorrection } from './siblings-correction';

export function ignoreBlock(source: string, tags: IgnoreTag[]): IgnoreBlock {
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
					MASK_CHAR.repeat(startTag.length) +
					taggedCode.replace(/[^\n]/g, MASK_CHAR) +
					MASK_CHAR.repeat((endTag || '').length);
				return mask;
			},
		);
		replaced = attr.replaced;
		stack.push(...attr.stack.map(res => ({ ...res, type: tag.type })));

		// Replace tags in other nodes
		const text = maskText(tag.start, tag.end, replaced, (startTag, taggedCode, endTag) => {
			const mask =
				MASK_CHAR.repeat(startTag.length) +
				taggedCode.replace(/[^\n]/g, MASK_CHAR) +
				MASK_CHAR.repeat((endTag || '').length);
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
	};
}

function maskText(
	start: RegExp,
	end: RegExp,
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
			endTag: endTag || null,
		});
		/**
		 * It will not replace line breaks because detects line number.
		 */
		replaced = above + masking(startTag, taggedCode, endTag) + (below || '');
	}
	return {
		replaced,
		stack,
	};
}

export function restoreNode(nodeList: MLASTNode[], ignoreBlock: IgnoreBlock) {
	nodeList = nodeList.slice();
	const { source, stack } = ignoreBlock;
	for (const node of nodeList) {
		if (node.type === 'comment' || node.type === 'text') {
			if (!hasIgnoreBlock(node.raw)) {
				continue;
			}
			const parentNode = node.parentNode;
			const index = nodeList.findIndex(n => n === node);
			const insertList: (MLASTText | MLASTPreprocessorSpecificBlock)[] = [];
			let text = node.raw;
			let pointer = 0;
			for (const tag of stack) {
				if (node.startOffset <= tag.index && tag.index < node.endOffset) {
					const start = tag.index - node.startOffset;
					const body = tag.startTag + tag.taggedCode + (tag.endTag || '');
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
				if (attr.type === 'ps-attr' || attr.value.raw === '' || !hasIgnoreBlock(attr.value.raw)) {
					continue;
				}
				for (const tag of stack) {
					if (attr.value.startOffset <= tag.index && tag.index < attr.value.endOffset) {
						attr.value.raw = tag.startTag + tag.taggedCode + tag.endTag;
						attr.isDynamicValue = true;
					}
				}
			}
		}
	}

	return nodeList;
}

function snap(str: string, reg: RegExp): [number, string] | [number, string, string, string] {
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

function removeGlobalOption(reg: RegExp) {
	return new RegExp(reg.source, reg.ignoreCase ? 'i' : '');
}

function prepend(reg: RegExp, str: string) {
	return new RegExp(str + reg.source, reg.ignoreCase ? 'i' : '');
}

function append(reg: RegExp, str: string) {
	return new RegExp(reg.source + str, reg.ignoreCase ? 'i' : '');
}

function hasIgnoreBlock(textContent: string) {
	return textContent.includes(MASK_CHAR);
}
