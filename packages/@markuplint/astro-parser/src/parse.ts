import type {
	Node,
	ElementNode,
	ComponentNode,
	FragmentNode,
	CustomElementNode,
	AttributeNode,
} from './astro-parser.js';
import type {
	MLASTElementCloseTag,
	MLASTNode,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTTag,
	MLASTText,
	ParserOptions,
	NamespaceURI,
	Parse,
} from '@markuplint/ml-ast';

import { parse as htmlParse } from '@markuplint/html-parser';
import {
	flattenNodes,
	detectElementType,
	getEndCol,
	getEndLine,
	sliceFragment,
	uuid,
	tagParser,
} from '@markuplint/parser-utils';

import { astroParse } from './astro-parser.js';
import { attrTokenizer } from './attr-tokenizer.js';

export const parse: Parse = (rawCode, options = {}) => {
	const ast = astroParse(rawCode);

	const htmlRawNodeList = traverse(ast, null, 'http://www.w3.org/1999/xhtml', rawCode, 0, options);

	const firstOffset = htmlRawNodeList[0]?.startOffset ?? 0;
	if (firstOffset > 0) {
		const head = rawCode.slice(0, firstOffset);

		const ast = htmlParse(head, {
			...options,
			ignoreFrontMatter: true,
		});

		const headNodes = ast.nodeList.filter(node => {
			return !node.isGhost;
		});

		htmlRawNodeList.unshift(...headNodes);
	}

	const nodeList: MLASTNode[] = flattenNodes(htmlRawNodeList, rawCode);

	return {
		nodeList,
		isFragment: true,
	};
};

function traverse(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	rootNode: Node,
	parentNode: MLASTParentNode | null = null,
	scopeNS: NamespaceURI,
	rawHtml: string,
	offset: number,
	options: ParserOptions,
	inExpression?: boolean,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	if (!('children' in rootNode)) {
		return nodeList;
	}

	if (rootNode.children.length === 0) {
		return nodeList;
	}

	let prevNode: MLASTNode | null = null;
	for (const astNode of rootNode.children) {
		const node = nodeize(astNode, prevNode, parentNode, scopeNS, rawHtml, offset, options, inExpression);
		if (!node) {
			continue;
		}
		const nodes = Array.isArray(node) ? node : [node];
		for (const node of nodes) {
			if (prevNode) {
				if (node.type !== 'endtag') {
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
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originNode: Node,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	prevNode: MLASTNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentNode: MLASTParentNode | null,
	scopeNS: NamespaceURI,
	rawHtml: string,
	offset = 0,
	options: ParserOptions,
	inExpression?: boolean,
): MLASTNode | MLASTNode[] | null {
	if (!originNode.position) {
		throw new TypeError("Node doesn't have position");
	}

	const nextNode = null;
	const startOffset = originNode.position.start.offset + offset;
	const endOffset = (originNode.position.end?.offset ?? originNode.position.start.offset) + offset;
	const { startLine, endLine, startCol, endCol, raw } = sliceFragment(rawHtml, startOffset, endOffset);

	if (
		scopeNS === 'http://www.w3.org/1999/xhtml' &&
		originNode.type === 'element' &&
		originNode.name?.toLowerCase() === 'svg'
	) {
		scopeNS = 'http://www.w3.org/2000/svg';
	} else if (scopeNS === 'http://www.w3.org/2000/svg' && parentNode && parentNode.nodeName === 'foreignObject') {
		scopeNS = 'http://www.w3.org/1999/xhtml';
	}

	switch (originNode.type) {
		case 'text': {
			if (inExpression) {
				return null;
			}
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
		case 'expression': {
			let _endOffset = endOffset;
			let _startLine = startLine;
			let _endLine = endLine;
			let _startCol = startCol;
			let _endCol = endCol;
			let _raw = raw;
			let closeExpression: MLASTPreprocessorSpecificBlock | null = null;

			const firstChild = originNode.children[0];
			const lastChild = originNode.children.at(-1);
			if (firstChild && lastChild && firstChild !== lastChild) {
				_endOffset = firstChild.position?.end?.offset ?? endOffset;
				const startLoc = sliceFragment(rawHtml, startOffset, _endOffset);

				_startLine = startLoc.startLine;
				_endLine = startLoc.endLine;
				_startCol = startLoc.startCol;
				_endCol = startLoc.endCol;
				_raw = startLoc.raw;

				const closeStartOffset = lastChild.position?.start.offset ?? startOffset;
				const closeLoc = sliceFragment(rawHtml, closeStartOffset, endOffset);

				closeExpression = {
					uuid: uuid(),
					raw: closeLoc.raw,
					startOffset: closeStartOffset,
					endOffset: closeLoc.endOffset,
					startLine: closeLoc.startLine,
					endLine: closeLoc.endLine,
					startCol: closeLoc.startCol,
					endCol: closeLoc.endCol,
					nodeName: 'MustacheTag',
					type: 'psblock',
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}

			const node: MLASTPreprocessorSpecificBlock = {
				uuid: uuid(),
				raw: _raw,
				startOffset,
				endOffset: _endOffset,
				startLine: _startLine,
				endLine: _endLine,
				startCol: _startCol,
				endCol: _endCol,
				nodeName: 'MustacheTag',
				type: 'psblock',
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};

			if (originNode.children.length > 0) {
				node.childNodes = traverse(originNode, parentNode, scopeNS, rawHtml, offset, options, true);
			}

			if (closeExpression) {
				return [node, closeExpression];
			}

			return node;
		}
		case 'comment': {
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
				type: 'comment',
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
		}
		case 'component':
		case 'custom-element':
		case 'fragment':
		case 'element': {
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
					type: 'doctype',
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}
			return parseElement(
				originNode,
				scopeNS,
				rawHtml,
				startLine,
				startCol,
				startOffset,
				parentNode,
				prevNode,
				nextNode,
				offset,
				options,
			);
		}
		default: {
			return null;
		}
	}
}

function parseElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originNode: ElementNode | ComponentNode | FragmentNode | CustomElementNode,
	scopeNS: NamespaceURI,
	rawHtml: string,
	startLine: number,
	startCol: number,
	startOffset: number,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentNode: MLASTParentNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	prevNode: MLASTNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nextNode: MLASTNode | null,
	offset: number,
	options: ParserOptions,
) {
	if (!originNode.position) {
		throw new TypeError("Node doesn't have position");
	}

	let startTagRaw: string;
	let childrenStart: number;
	let childrenEnd: number;
	if (originNode.children[0]) {
		childrenStart = (originNode.children[0].position?.start?.offset ?? 0) + offset;
		childrenEnd = (originNode.children.at(-1)?.position?.end?.offset ?? 0) + offset;
		const startTagStartOffset = originNode.position.start.offset + offset;
		const startTagEndOffset = childrenStart;
		startTagRaw = rawHtml.slice(startTagStartOffset, startTagEndOffset);
	} else {
		childrenStart = offset + (originNode.position.end?.offset ?? nextNode?.endOffset ?? rawHtml.length - offset);
		childrenEnd = childrenStart;
		const startTagStartOffset = originNode.position.start.offset + offset;
		let startTagEndOffset = childrenStart;
		startTagRaw = rawHtml.slice(startTagStartOffset, startTagEndOffset);
		const expectedCloseTag = `</${originNode.name}>`;
		if (startTagRaw.includes(expectedCloseTag)) {
			childrenStart -= expectedCloseTag.length;
			childrenEnd = childrenStart;
			startTagRaw = startTagRaw.replace(expectedCloseTag, '');
		} else {
			let startTagRawMasked = startTagRaw;
			for (const attr of originNode.attributes) {
				startTagRawMasked = startTagRawMasked.replace(attr.value, ' '.repeat(attr.value.length));
			}
			const closeChars = '>';
			const closeOffset = startTagRawMasked.indexOf(closeChars) + closeChars.length;
			startTagEndOffset = startTagStartOffset + closeOffset;
			startTagRaw = rawHtml.slice(startTagStartOffset, startTagEndOffset);
		}

		// console.log({
		// 	originNode,
		// 	attrs: originNode.attributes,
		// 	startTagRaw,
		// 	startTagStartOffset,
		// 	startTagEndOffset,
		// 	expectedCloseTag,
		// 	childrenStart,
		// 	childrenEnd,
		// });
	}

	const tagTokens = tagParser(startTagRaw, startLine, startCol, startOffset);
	const tagName = tagTokens.tagName;
	let endTag: MLASTElementCloseTag | null = null;
	if (childrenEnd < (originNode.position.end?.offset ?? 0) + offset) {
		const endTagLoc = sliceFragment(rawHtml, childrenEnd, (originNode.position.end?.offset ?? 0) + offset);
		const endTagTokens = tagParser(endTagLoc.raw, endTagLoc.startLine, endTagLoc.startCol, endTagLoc.startOffset);
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
			type: 'endtag',
			namespace: scopeNS,
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
		namespace: scopeNS,
		elementType: detectElementType(tagName, options?.authoredElementName, /^[A-Z]|\./),
		attributes: originNode.attributes.map(
			(
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				attr: AttributeNode,
				i,
			) =>
				attrTokenizer(
					attr,
					originNode.attributes[i + 1] ?? null,
					rawHtml,
					startTagRaw,
					startOffset + startTagRaw.length,
				),
		),
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
	startTag.childNodes = ['style', 'script'].includes(tagName)
		? undefined
		: traverse(originNode, startTag, scopeNS, rawHtml, offset, options);
	return startTag;
}
