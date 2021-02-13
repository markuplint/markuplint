import {
	MLASTElementCloseTag,
	MLASTNode,
	MLASTNodeType,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTTag,
	MLASTText,
} from '@markuplint/ml-ast';
import { SvelteDirective, SvelteNode } from './svelte-parser';
import { sliceFragment, uuid } from '@markuplint/parser-utils';
import { attr } from './attr';
import { parseRawTag } from '@markuplint/html-parser';
import { traverse } from './traverse';

export function nodeize(
	originNode: SvelteNode,
	prevNode: MLASTNode | null,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
): MLASTNode | MLASTNode[] | null {
	const nextNode = null;
	const { startOffset, endOffset, startLine, endLine, startCol, endCol, raw } = sliceFragment(
		rawHtml,
		originNode.start,
		originNode.end,
	);

	switch (originNode.type) {
		case 'Text': {
			const node: MLASTText = {
				uuid: uuid(),
				raw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: '#text',
				type: MLASTNodeType.Text,
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
			return node;
		}
		case 'MustacheTag': {
			return {
				uuid: uuid(),
				raw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: '#comment',
				type: MLASTNodeType.Comment,
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
		}
		case 'Element': {
			const children = originNode.children || [];
			const reEndTag = new RegExp(`</${originNode.name}\\s*>$`, 'i');
			const startTagEndOffset = children.length
				? children[0].start
				: raw.replace(reEndTag, '').length + startOffset;
			const startTagLocation = sliceFragment(rawHtml, startOffset, startTagEndOffset);

			let endTag: MLASTElementCloseTag | null = null;
			if (reEndTag.test(raw)) {
				const endTagRawMatched = raw.match(reEndTag);
				if (!endTagRawMatched) {
					throw new Error('Parse error');
				}
				const endTagRaw = endTagRawMatched[0];
				const endTagStartOffset = startOffset + raw.indexOf(endTagRaw);
				const endTagEndOffset = endTagStartOffset + endTagRaw.length;
				const endTagLocation = sliceFragment(rawHtml, endTagStartOffset, endTagEndOffset);
				endTag = {
					uuid: uuid(),
					raw: endTagRaw,
					startOffset: endTagStartOffset,
					endOffset: endTagEndOffset,
					startLine: endTagLocation.startLine,
					endLine: endTagLocation.endLine,
					startCol: endTagLocation.startCol,
					endCol: endTagLocation.endCol,
					nodeName: originNode.name,
					type: MLASTNodeType.EndTag,
					namespace: originNode.namespace,
					attributes: [],
					parentNode,
					prevNode,
					nextNode,
					pearNode: null,
					isFragment: false,
					isGhost: false,
					tagOpenChar: '</',
					tagCloseChar: '>',
				};
			}

			const attributes: SvelteDirective[] = originNode.attributes || [];
			const tagTokens = parseRawTag(
				startTagLocation.raw,
				startTagLocation.startLine,
				startTagLocation.startCol,
				startTagLocation.startOffset,
			);

			const startTag: MLASTTag = {
				uuid: uuid(),
				...startTagLocation,
				nodeName: originNode.name,
				type: MLASTNodeType.StartTag,
				namespace: 'http://www.w3.org/1999/xhtml',
				attributes: attributes.map(a => attr(a, rawHtml)),
				parentNode,
				prevNode,
				nextNode,
				pearNode: endTag,
				selfClosingSolidus: tagTokens.selfClosingSolidus,
				endSpace: tagTokens.endSpace,
				isFragment: false,
				isGhost: false,
				tagOpenChar: '<',
				tagCloseChar: '>',
			};
			if (endTag) {
				endTag.pearNode = startTag;
			}

			if (originNode.children) {
				startTag.childNodes = traverse(originNode.children, startTag, rawHtml);
			}

			return startTag;
		}
		case 'IfBlock': {
			return solveCtrlBlock('if', originNode, raw, rawHtml, startOffset, parentNode, prevNode, nextNode);
		}
		case 'EachBlock': {
			return solveCtrlBlock('each', originNode, raw, rawHtml, startOffset, parentNode, prevNode, nextNode);
		}
		case 'AwaitBlock': {
			const pendingNode = originNode.pending;
			const pendingTag = sliceFragment(rawHtml, originNode.start, pendingNode.start);
			const pending: MLASTPreprocessorSpecificBlock = {
				uuid: uuid(),
				...pendingTag,
				nodeName: pendingNode.type,
				type: MLASTNodeType.PreprocessorSpecificBlock,
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
			if (pendingNode.children) {
				pending.childNodes = traverse(pendingNode.children, pending, rawHtml);
			}

			let then: MLASTPreprocessorSpecificBlock | null = null;
			if (originNode.then) {
				const thenNode = originNode.then;
				const thenTag = sliceFragment(
					rawHtml,
					thenNode.start,
					(thenNode.children && thenNode.children[0] && thenNode.children[0].start) ?? thenNode.end,
				);
				then = {
					uuid: uuid(),
					...thenTag,
					nodeName: thenNode.type,
					type: MLASTNodeType.PreprocessorSpecificBlock,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
				if (thenNode.children) {
					then.childNodes = traverse(thenNode.children, then, rawHtml);
				}
			}

			let awaitCatch: MLASTPreprocessorSpecificBlock | null = null;
			if (originNode.catch) {
				const awaitCatchNode = originNode.catch;
				const awaitCatchTag = sliceFragment(
					rawHtml,
					awaitCatchNode.start,
					(awaitCatchNode.children && awaitCatchNode.children[0] && awaitCatchNode.children[0].start) ??
						awaitCatchNode.end,
				);
				awaitCatch = {
					uuid: uuid(),
					...awaitCatchTag,
					nodeName: awaitCatchNode.type,
					type: MLASTNodeType.PreprocessorSpecificBlock,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
				if (awaitCatchNode.children) {
					awaitCatch.childNodes = traverse(awaitCatchNode.children, awaitCatch, rawHtml);
				}
			}

			const reEndTag = new RegExp('{/await}$', 'i');
			let endTag: MLASTPreprocessorSpecificBlock | null = null;
			if (reEndTag.test(raw)) {
				const endTagRawMatched = raw.match(reEndTag);
				if (!endTagRawMatched) {
					throw new Error('Parse error');
				}
				const endTagRaw = endTagRawMatched[0];
				const endTagStartOffset = startOffset + raw.indexOf(endTagRaw);
				const endTagEndOffset = endTagStartOffset + endTagRaw.length;
				const endTagLocation = sliceFragment(rawHtml, endTagStartOffset, endTagEndOffset);
				endTag = {
					uuid: uuid(),
					raw: endTagRaw,
					startOffset: endTagStartOffset,
					endOffset: endTagEndOffset,
					startLine: endTagLocation.startLine,
					endLine: endTagLocation.endLine,
					startCol: endTagLocation.startCol,
					endCol: endTagLocation.endCol,
					nodeName: originNode.type,
					type: MLASTNodeType.PreprocessorSpecificBlock,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}

			const tags: MLASTPreprocessorSpecificBlock[] = [pending];

			if (then) {
				tags.push(then);
			}
			if (awaitCatch) {
				tags.push(awaitCatch);
			}
			if (endTag) {
				tags.push(endTag);
			}

			return tags;
		}
		default: {
			return {
				uuid: uuid(),
				raw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: originNode.name || originNode.type,
				type: MLASTNodeType.PreprocessorSpecificBlock,
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
		}
	}
}

function solveCtrlBlock(
	ctrlName: string,
	originNode: SvelteNode,
	raw: string,
	rawHtml: string,
	startOffset: number,
	parentNode: MLASTParentNode | null,
	prevNode: MLASTNode | null,
	nextNode: MLASTNode | null,
) {
	const children = originNode.children || [];
	const reEndTag = new RegExp(`{/${ctrlName}}$`, 'i');
	const startTagEndOffset = children.length ? children[0].start : raw.replace(reEndTag, '').length + startOffset;
	const startTagLocation = sliceFragment(rawHtml, startOffset, startTagEndOffset);

	let endTag: MLASTPreprocessorSpecificBlock | null = null;
	if (reEndTag.test(raw)) {
		const endTagRawMatched = raw.match(reEndTag);
		if (!endTagRawMatched) {
			throw new Error('Parse error');
		}
		const endTagRaw = endTagRawMatched[0];
		const endTagStartOffset = startOffset + raw.indexOf(endTagRaw);
		const endTagEndOffset = endTagStartOffset + endTagRaw.length;
		const endTagLocation = sliceFragment(rawHtml, endTagStartOffset, endTagEndOffset);
		endTag = {
			uuid: uuid(),
			raw: endTagRaw,
			startOffset: endTagStartOffset,
			endOffset: endTagEndOffset,
			startLine: endTagLocation.startLine,
			endLine: endTagLocation.endLine,
			startCol: endTagLocation.startCol,
			endCol: endTagLocation.endCol,
			nodeName: originNode.type,
			type: MLASTNodeType.PreprocessorSpecificBlock,
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: false,
		};
	}

	let elseTag: MLASTPreprocessorSpecificBlock | null = null;
	if (originNode.else) {
		const elseNode = originNode.else;
		const elseTagStartOffset = children.length ? children[children.length - 1].end : startTagLocation.endOffset;
		const elseTagLocation = sliceFragment(rawHtml, elseTagStartOffset, elseNode.start);

		elseTag = {
			uuid: uuid(),
			...elseTagLocation,
			nodeName: elseNode.type,
			type: MLASTNodeType.PreprocessorSpecificBlock,
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: false,
		};

		if (elseNode.children) {
			elseTag.childNodes = traverse(elseNode.children, elseTag, rawHtml);
		}
	}

	const tag: MLASTPreprocessorSpecificBlock = {
		uuid: uuid(),
		...startTagLocation,
		nodeName: originNode.type,
		type: MLASTNodeType.PreprocessorSpecificBlock,
		parentNode,
		prevNode,
		nextNode,
		isFragment: false,
		isGhost: false,
	};

	if (originNode.children) {
		tag.childNodes = traverse(originNode.children, tag, rawHtml);
	}

	const tags: MLASTPreprocessorSpecificBlock[] = [tag];
	if (elseTag) {
		tags.push(elseTag);
	}
	if (endTag) {
		tags.push(endTag);
	}

	return tags;
}
