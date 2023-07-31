import type { SvelteNode } from './svelte-parser/index.js';
import type { MLASTNode, MLASTParentNode, MLASTPreprocessorSpecificBlock, ParserOptions } from '@markuplint/ml-ast';

import { sliceFragment, uuid } from '@markuplint/parser-utils';

import { traverse } from './traverse.js';

export function parseCtrlBlock(
	ctrlName: 'if' | 'each',
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originNode: SvelteNode,
	raw: string,
	rawHtml: string,
	startOffset: number,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentNode: MLASTParentNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	prevNode: MLASTNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nextNode: MLASTNode | null,
	options?: ParserOptions,
) {
	if (ctrlName === 'if') {
		return parseIfBlock(
			originNode,
			raw,
			rawHtml,
			startOffset,
			originNode.start,
			parentNode,
			prevNode,
			nextNode,
			options,
		);
	}

	const children = originNode.children ?? [];
	const reEndTag = new RegExp('{/each}$', 'i');
	const startTagEndOffset =
		children.length > 0 ? children[0]?.start ?? 0 : raw.replace(reEndTag, '').length + startOffset;
	const startTagLocation = sliceFragment(rawHtml, startOffset, startTagEndOffset);

	const tag: MLASTPreprocessorSpecificBlock = {
		uuid: uuid(),
		...startTagLocation,
		nodeName: originNode.type,
		type: 'psblock',
		parentNode,
		prevNode,
		nextNode,
		isFragment: false,
		isGhost: false,
	};

	if (originNode.children) {
		tag.childNodes = traverse(originNode.children, tag, rawHtml, options);
	}

	let elseTag: MLASTPreprocessorSpecificBlock | null = null;
	if (originNode.else) {
		const elseNode = originNode.else;
		const elseTagStartOffset =
			children.length > 0 ? children[children.length - 1]?.end ?? 0 : startTagLocation.endOffset;
		const elseTagLocation = sliceFragment(rawHtml, elseTagStartOffset, elseNode.start);

		elseTag = {
			uuid: uuid(),
			...elseTagLocation,
			nodeName: elseNode.type,
			type: 'psblock',
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: false,
		};

		if (elseNode.children) {
			elseTag.childNodes = traverse(elseNode.children, elseTag, rawHtml, options);
		}
	}

	let endTag: MLASTPreprocessorSpecificBlock | null = null;
	const endTagRawMatched = raw.match(reEndTag);
	if (endTagRawMatched) {
		const endTagRaw = endTagRawMatched[0];
		const endTagStartOffset = originNode.end - endTagRaw.length;
		const endTagEndOffset = originNode.end;
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
			type: 'psblock',
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: false,
		};
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

function parseIfBlock(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originNode: SvelteNode,
	raw: string,
	rawHtml: string,
	statementStartOffset: number,
	tokenStartOffset: number,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentNode: MLASTParentNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	prevNode: MLASTNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nextNode: MLASTNode | null,
	options?: ParserOptions,
) {
	const children = originNode.children ?? [];
	const startTagEndOffset = children[0]?.start ?? tokenStartOffset;
	const startTagLocation = sliceFragment(rawHtml, tokenStartOffset, startTagEndOffset);

	const tag: MLASTPreprocessorSpecificBlock = {
		uuid: uuid(),
		...startTagLocation,
		nodeName: originNode.elseif ? 'ElseIfBlock' : originNode.type,
		type: 'psblock',
		parentNode,
		prevNode,
		nextNode,
		isFragment: false,
		isGhost: false,
	};

	if (originNode.children) {
		tag.childNodes = traverse(originNode.children, tag, rawHtml, options);
	}

	const elseOrElseIfTags: MLASTPreprocessorSpecificBlock[] = [];
	if (originNode.else) {
		const elseNode = originNode.else;
		const elseTagStartOffset =
			children.length > 0 ? children[children.length - 1]?.end ?? 0 : startTagLocation.endOffset;
		const elseTagLocation = sliceFragment(rawHtml, elseTagStartOffset, elseNode.start);

		if (elseNode.children) {
			if (elseNode.children.length === 1 && elseNode.children[0]?.type === 'IfBlock') {
				const elseIfTags = parseIfBlock(
					elseNode.children[0],
					elseTagLocation.raw,
					rawHtml,
					statementStartOffset,
					originNode.children?.[0]?.end ?? startTagLocation.endOffset,
					parentNode,
					null,
					null,
					options,
				);

				elseOrElseIfTags.push(...elseIfTags);
			} else {
				const elseTag: MLASTPreprocessorSpecificBlock = {
					uuid: uuid(),
					...elseTagLocation,
					nodeName: elseNode.type,
					type: 'psblock',
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};

				elseTag.childNodes = traverse(elseNode.children, elseTag, rawHtml, options);

				elseOrElseIfTags.push(elseTag);
			}
		}
	}

	if (originNode.elseif) {
		return [tag, ...elseOrElseIfTags];
	}

	const endTagRawMatched = raw.match('{/if}');
	if (!endTagRawMatched) {
		throw new Error('Missing the end token `{/if}`');
	}

	const endTagRaw = endTagRawMatched[0];
	const endTagStartOffset = originNode.end - endTagRaw.length;
	const endTagEndOffset = originNode.end;
	const endTagLocation = sliceFragment(rawHtml, endTagStartOffset, endTagEndOffset);
	const endTag: MLASTPreprocessorSpecificBlock = {
		uuid: uuid(),
		raw: endTagRaw,
		startOffset: endTagStartOffset,
		endOffset: endTagEndOffset,
		startLine: endTagLocation.startLine,
		endLine: endTagLocation.endLine,
		startCol: endTagLocation.startCol,
		endCol: endTagLocation.endCol,
		nodeName: originNode.type,
		type: 'psblock',
		parentNode,
		prevNode,
		nextNode,
		isFragment: false,
		isGhost: false,
	};

	return [tag, ...elseOrElseIfTags, endTag];
}
