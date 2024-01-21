import type { ASTNode, VueTokens, ASTComment } from './vue-parser/index.js';
import type {
	MLASTElementCloseTag,
	MLASTNode,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
	ParserOptions,
	Parse,
	MLASTComment,
} from '@markuplint/ml-ast';

import {
	flattenNodes,
	getEndCol,
	getEndLine,
	uuid,
	ParserError,
	detectElementType,
	tagParser,
} from '@markuplint/parser-utils';

import { attr } from './attr.js';
import { vueParse } from './vue-parser/index.js';

export const parse: Parse = (rawCode, options) => {
	let ast: VueTokens;

	try {
		ast = vueParse(rawCode);
	} catch (error) {
		if (error instanceof SyntaxError && 'lineNumber' in error && 'column' in error) {
			throw new ParserError(
				// @ts-ignore
				error.message,
				{
					// @ts-ignore
					line: error.lineNumber,
					// @ts-ignore
					col: error.column,
					raw: '',
				},
			);
		}
		return {
			nodeList: [],
			isFragment: true,
			parseError: error instanceof Error ? error.message : new Error(`${error}`).message,
		};
	}

	const nodeList: MLASTNode[] = ast.templateBody
		? flattenNodes(traverse(ast.templateBody, null, rawCode, ast.templateBody.comments, options), rawCode)
		: [];

	// Remove `</template>`
	const templateEndTagIndex = nodeList.findIndex(node => /\s*<\/\s*template\s*>\s*/i.test(node.raw));
	if (templateEndTagIndex !== -1) {
		const templateEndTag = nodeList[templateEndTagIndex];
		for (const node of nodeList) {
			if (node.nextNode && node.nextNode.uuid === templateEndTag?.uuid) {
				node.nextNode = null;
			}
		}
		nodeList.splice(templateEndTagIndex, 1);
	}

	return {
		nodeList,
		isFragment: true,
	};
};

function traverse(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	rootNode: ASTNode,
	parentNode: MLASTParentNode | null = null,
	rawHtml: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	comments: ReadonlyArray<ASTComment>,
	options?: ParserOptions,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	if (rootNode.type !== 'VElement') {
		return [];
	}

	let prevNode: MLASTNode | null = null;
	for (const vNode of rootNode.children) {
		const node = nodeize(vNode, prevNode, parentNode, rawHtml, comments, options);
		if (!node) {
			continue;
		}

		const lastOffset = prevNode?.endOffset ?? parentNode?.endOffset ?? 0;

		const betweenComment = comments.find(comment => {
			return lastOffset <= comment.range[0] && comment.range[1] <= node.startOffset;
		});

		if (betweenComment) {
			const comment: MLASTComment = {
				uuid: uuid(),
				raw: `<!--${betweenComment.value}-->`,
				startOffset: betweenComment.range[0],
				endOffset: betweenComment.range[1],
				startLine: betweenComment.loc.start.line,
				endLine: betweenComment.loc.end.line,
				startCol: betweenComment.loc.start.column + 1,
				endCol: betweenComment.loc.end.column + 1,
				nodeName: '#comment',
				type: 'comment',
				parentNode,
				prevNode,
				nextNode: node,
				isFragment: false,
				isGhost: false,
			};

			comment.parentNode = parentNode;
			comment.prevNode = prevNode;
			comment.nextNode = node;

			if (prevNode) {
				prevNode.nextNode = comment;
			}

			nodeList.push(comment);

			prevNode = comment;
		}

		if (prevNode) {
			if (node.type !== 'endtag') {
				prevNode.nextNode = node;
			}

			node.prevNode = prevNode;
		}

		prevNode = node;
		nodeList.push(node);
	}
	return nodeList;
}

function nodeize(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originNode: ASTNode,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	prevNode: MLASTNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentNode: MLASTParentNode | null,
	rawHtml: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	comments: ReadonlyArray<ASTComment>,
	options?: ParserOptions,
): MLASTNode | null {
	const nextNode = null;
	const startOffset = originNode.range[0];
	const endOffset = originNode.range[1];
	const startLine = originNode.loc.start.line;
	const endLine = originNode.loc.end.line;
	const startCol = originNode.loc.start.column + 1;
	const endCol = originNode.loc.end.column + 1;
	const raw = rawHtml.slice(startOffset, endOffset ?? startOffset);

	switch (originNode.type) {
		case 'VText': {
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
				type: 'text',
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
			return node;
		}
		case 'VExpressionContainer': {
			return {
				uuid: uuid(),
				raw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: '#vue-expression-container',
				type: 'psblock',
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
		}
		default: {
			const tagLoc = originNode.startTag;
			const startTagRaw = rawHtml.slice(tagLoc.range[0], tagLoc.range[1]);
			const tagTokens = tagParser(startTagRaw, startLine, startCol, startOffset);
			const tagName = tagTokens.tagName;
			let endTag: MLASTElementCloseTag | null = null;
			const endTagLoc = originNode.endTag;
			if (endTagLoc) {
				const endTagRaw = rawHtml.slice(endTagLoc.range[0], endTagLoc.range[1]);
				const endTagTokens = tagParser(
					endTagRaw,
					endTagLoc.loc.start.line,
					endTagLoc.loc.start.column,
					endTagLoc.range[0],
				);
				const endTagName = endTagTokens.tagName;
				endTag = {
					uuid: uuid(),
					raw: endTagRaw,
					startOffset: endTagLoc.range[0],
					endOffset: endTagLoc.range[1],
					startLine: endTagLoc.loc.start.line,
					endLine: endTagLoc.loc.end.line,
					startCol: endTagLoc.loc.start.column + 1,
					endCol: endTagLoc.loc.end.column + 1,
					nodeName: endTagName,
					type: 'endtag',
					namespace: originNode.namespace,
					attributes: endTagTokens.attrs,
					parentNode,
					prevNode,
					nextNode,
					pairNode: null,
					isFragment: false,
					isGhost: false,
					tagOpenChar: '</',
					tagCloseChar: '>',
				};
			}
			const startTag: MLASTTag = {
				uuid: uuid(),
				raw: startTagRaw,
				startOffset,
				endOffset: startOffset + startTagRaw.length,
				startLine,
				endLine: getEndLine(startTagRaw, startLine),
				startCol,
				endCol: getEndCol(startTagRaw, startCol),
				nodeName: tagName,
				type: 'starttag',
				namespace: originNode.namespace,
				elementType: detectElementType(
					tagName,
					options?.authoredElementName,
					/**
					 * @see https://vuejs.org/api/built-in-components.html
					 * @see https://vuejs.org/api/built-in-special-elements.html
					 */
					[
						'component',
						'slot',
						'Transition',
						'TransitionGroup',
						'KeepAlive',
						'Teleport',
						'Suspense',
						// Backward compatibility
						/^[A-Z]/,
					],
				),
				attributes: tagTokens.attrs.map(attr),
				hasSpreadAttr: false,
				parentNode,
				prevNode,
				nextNode,
				pairNode: endTag,
				selfClosingSolidus: tagTokens.selfClosingSolidus,
				endSpace: tagTokens.afterAttrSpaces,
				isFragment: false,
				isGhost: false,
				tagOpenChar: '<',
				tagCloseChar: '>',
			};
			if (endTag) {
				endTag.pairNode = startTag;
			}
			startTag.childNodes = traverse(originNode, startTag, rawHtml, comments, options);
			return startTag;
		}
	}
}
