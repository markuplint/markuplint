import { ASTAttribute, ASTNode, ASTStyleNode, AstroCompileError, astroParse } from './astro-parser';
import {
	MLASTElement,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTNodeType,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTTag,
	MLASTText,
	Parse,
} from '@markuplint/ml-ast';
import { flattenNodes, parseRawTag } from '@markuplint/html-parser';
import { getEndCol, getEndLine, isPotentialCustomElementName, sliceFragment, uuid } from '@markuplint/parser-utils';
import { attrTokenizer } from './attr-tokenizer';

export const parse: Parse = rawCode => {
	const ast = astroParse(rawCode);

	if (ast instanceof AstroCompileError) {
		return {
			nodeList: [],
			isFragment: true,
			parseError: ast.stack || ast.message,
		};
	}

	if (!ast.html) {
		return {
			nodeList: [],
			isFragment: false,
		};
	}

	const htmlRawNodeList = traverse(ast.html, null, rawCode);
	if (ast.style) {
		const styleNodes = parseStyle(ast.style, rawCode, 0);
		htmlRawNodeList.push(...styleNodes);
	}

	const nodeList: MLASTNode[] = flattenNodes(htmlRawNodeList, rawCode);

	// Remove `</template>`
	const templateEndTagIndex = nodeList.findIndex(node => /\s*<\/\s*template\s*>\s*/i.test(node.raw));
	if (templateEndTagIndex !== -1) {
		const templateEndTag = nodeList[templateEndTagIndex];
		for (const node of nodeList) {
			if (node.nextNode && node.nextNode.uuid === templateEndTag.uuid) {
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
	rootNode: ASTNode,
	parentNode: MLASTParentNode | null = null,
	rawHtml: string,
	offset?: number,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	if (!rootNode.children) {
		return nodeList;
	}

	let prevNode: MLASTNode | null = null;
	for (const astNode of rootNode.children) {
		const node = nodeize(astNode, prevNode, parentNode, rawHtml, offset);
		if (!node) {
			continue;
		}
		const nodes = Array.isArray(node) ? node : [node];
		for (const node of nodes) {
			if (prevNode) {
				if (node.type !== MLASTNodeType.EndTag) {
					prevNode.nextNode = node;
				}
				node.prevNode = prevNode;
			}
			prevNode = node;
			nodeList.push(node);
		}
	}
	return nodeList;
}

function nodeize(
	originNode: ASTNode,
	prevNode: MLASTNode | null,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
	offset = 0,
): MLASTNode | MLASTNode[] | null {
	const nextNode = null;
	const startOffset = originNode.start + offset;
	const endOffset = originNode.end + offset;
	const { startLine, endLine, startCol, endCol, raw } = sliceFragment(rawHtml, startOffset, endOffset);

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
			if (!originNode.expression.children || originNode.expression.children.length === 0) {
				return {
					uuid: uuid(),
					raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: originNode.type,
					type: MLASTNodeType.PreprocessorSpecificBlock,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}
			// console.log(originNode, originNode.expression);
			let stub = raw;
			const blocks: MLASTPreprocessorSpecificBlock[] = [];
			const chunks = (originNode.expression.codeChunks as string[]).map((chunk, i) => {
				if (i === 0) {
					return `{${chunk}`;
				} else if (i === originNode.expression.codeChunks.length - 1) {
					return `${chunk}}`;
				}
				return chunk;
			});
			for (const chunk of chunks) {
				const i = stub.indexOf(chunk);
				if (i === -1) {
					throw new Error(`Invalid chunk: "${chunk}" from ${raw}`);
				}
				const prevBlock = blocks[blocks.length - 1];
				const prevBlockEndOffset = prevBlock ? prevBlock.endOffset : originNode.start;
				const loc = sliceFragment(rawHtml, prevBlockEndOffset + i, prevBlockEndOffset + i + chunk.length);
				blocks.push({
					uuid: uuid(),
					raw: chunk,
					startOffset: loc.startOffset,
					endOffset: loc.endOffset,
					startLine: loc.startLine,
					endLine: loc.endLine,
					startCol: loc.startCol,
					endCol: loc.endCol,
					nodeName: originNode.type,
					type: MLASTNodeType.PreprocessorSpecificBlock,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				});
				stub = stub.slice(i + chunk.length);
			}
			if (blocks[0]) {
				const childNodes = traverse(originNode.expression, blocks[0], rawHtml, blocks[0].endOffset);
				blocks[0].childNodes = childNodes;
			}
			return blocks;
		}
		case 'Comment': {
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
		case 'InlineComponent':
		case 'Element': {
			if (originNode.name?.toLowerCase() === '!doctype') {
				return {
					uuid: uuid(),
					raw,
					name: originNode.name,
					publicId: '',
					systemId: '',
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: '#doctype',
					type: MLASTNodeType.Doctype,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}
			return parseElement(
				originNode.name,
				originNode,
				rawHtml,
				startLine,
				startCol,
				startOffset,
				parentNode,
				prevNode,
				nextNode,
				offset,
			);
		}
		case 'Fragment': {
			return originNode.children ? traverse(originNode, parentNode, rawHtml, offset) : null;
		}
		default: {
			return null;
		}
	}
}

function parseElement(
	nodeName: string,
	originNode: ASTNode | ASTStyleNode,
	rawHtml: string,
	startLine: number,
	startCol: number,
	startOffset: number,
	parentNode: MLASTParentNode | null,
	prevNode: MLASTNode | null,
	nextNode: MLASTNode | null,
	offset: number,
) {
	const { raw } = sliceFragment(rawHtml, originNode.start + offset, originNode.end + offset);
	let childrenStart: number;
	let childrenEnd: number;
	if (originNode.children && originNode.children[0]) {
		childrenStart = originNode.children[0].start + offset;
		childrenEnd = originNode.children[originNode.children.length - 1].end + offset;
	} else if (originNode.content) {
		childrenStart = originNode.content.start + offset;
		childrenEnd = originNode.content.end + offset;
	} else if (/\/>$/.test(raw)) {
		childrenStart = originNode.end + offset;
		childrenEnd = originNode.end + offset;
	} else {
		const expectedEndTag = `</${nodeName}>`;
		const endTagStart = originNode.end + offset - expectedEndTag.length;
		childrenStart = endTagStart;
		childrenEnd = endTagStart;
	}
	const startTagStartOffset = originNode.start + offset;
	const startTagEndOffset = childrenStart;
	const startTagRaw = rawHtml.slice(startTagStartOffset, startTagEndOffset);
	const tagTokens = parseRawTag(startTagRaw, startLine, startCol, startOffset);
	const tagName = tagTokens.tagName;
	let endTag: MLASTElementCloseTag | null = null;
	if (childrenEnd < originNode.end + offset) {
		const endTagLoc = sliceFragment(rawHtml, childrenEnd, originNode.end + offset);
		const endTagTokens = parseRawTag(endTagLoc.raw, endTagLoc.startLine, endTagLoc.startCol, endTagLoc.startOffset);
		const endTagName = endTagTokens.tagName;
		endTag = {
			uuid: uuid(),
			raw: endTagLoc.raw,
			startOffset: endTagLoc.startOffset,
			endOffset: endTagLoc.endOffset,
			startLine: endTagLoc.startLine,
			endLine: endTagLoc.endLine,
			startCol: endTagLoc.startCol,
			endCol: endTagLoc.endCol,
			nodeName: endTagName,
			type: MLASTNodeType.EndTag,
			namespace: originNode.namespace,
			attributes: endTagTokens.attrs,
			parentNode,
			prevNode,
			nextNode,
			pearNode: null,
			isFragment: false,
			isGhost: false,
			tagOpenChar: '</',
			tagCloseChar: '>',
			isCustomElement: isCustomComponentName(endTagName),
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
		type: MLASTNodeType.StartTag,
		namespace: originNode.namespace,
		attributes: originNode.attributes.map((attr: ASTAttribute) => attrTokenizer(attr, rawHtml, offset)),
		hasSpreadAttr: false,
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
		isCustomElement: isCustomComponentName(tagName),
	};
	if (endTag) {
		endTag.pearNode = startTag;
	}
	startTag.childNodes = traverse(originNode, startTag, rawHtml, offset);
	return startTag;
}

function parseStyle(nodes: ASTStyleNode[], rawHtml: string, offset: number) {
	const result: MLASTElement[] = [];
	for (const node of nodes) {
		const { startLine, startCol, startOffset } = sliceFragment(rawHtml, node.start, node.end);
		const styleEl = parseElement(
			'style',
			node,
			rawHtml,
			startLine,
			startCol,
			startOffset,
			null,
			null,
			null,
			offset,
		);
		result.push(styleEl);
	}
	return result;
}

function isCustomComponentName(name: string) {
	return isPotentialCustomElementName(name) || /[A-Z]|\./.test(name);
}
