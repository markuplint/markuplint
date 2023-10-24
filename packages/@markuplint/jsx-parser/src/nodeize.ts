import type { JSXNode } from './jsx.js';
import type {
	MLASTElementCloseTag,
	MLASTNode,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
	ParserOptions,
} from '@markuplint/ml-ast';

import { getNamespace } from '@markuplint/html-parser';
import { detectElementType, sliceFragment, uuid, tagParser } from '@markuplint/parser-utils';

import { attr } from './attr.js';
import { getAttr, getName } from './jsx.js';
import { traverse } from './traverse.js';

export function nodeize(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	originNode: JSXNode,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	prevNode: MLASTNode | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentNode: MLASTParentNode | null,
	rawHtml: string,
	options?: ParserOptions,
): MLASTNode | MLASTNode[] | null {
	const nextNode = null;
	const parentNamespace =
		parentNode && 'namespace' in parentNode ? parentNode.namespace : 'http://www.w3.org/1999/xhtml';

	if (originNode.__alreadyNodeized) {
		return null;
	}

	originNode.__alreadyNodeized = true;

	switch (originNode.type) {
		case 'JSXText': {
			const { startOffset, endOffset, startLine, endLine, startCol, endCol, raw } = sliceFragment(
				rawHtml,
				originNode.range[0],
				originNode.range[1],
			);
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
				__parentId: originNode.__parentId ?? null,
			};
			return node;
		}
		case 'JSXElement': {
			const startTagLocation = sliceFragment(
				rawHtml,
				originNode.openingElement.range[0],
				originNode.openingElement.range[1],
			);

			let endTag: MLASTElementCloseTag | null = null;
			if (originNode.closingElement) {
				const endTagLocation = sliceFragment(
					rawHtml,
					originNode.closingElement.range[0],
					originNode.closingElement.range[1],
				);
				const endTagRaw = endTagLocation.raw;
				const endTagStartOffset = endTagLocation.startOffset;
				const endTagEndOffset = endTagLocation.endOffset;
				const nodeName = getName(originNode.closingElement.name);
				const namespace = getNamespace(nodeName, parentNamespace);
				endTag = {
					uuid: uuid(),
					raw: endTagRaw,
					startOffset: endTagStartOffset,
					endOffset: endTagEndOffset,
					startLine: endTagLocation.startLine,
					endLine: endTagLocation.endLine,
					startCol: endTagLocation.startCol,
					endCol: endTagLocation.endCol,
					nodeName,
					type: 'endtag',
					namespace,
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

			const { attrs /*hasSpreadAttr*/ } = getAttr(originNode.openingElement.attributes);
			const tagTokens = tagParser(
				startTagLocation.raw,
				startTagLocation.startLine,
				startTagLocation.startCol,
				startTagLocation.startOffset,
			);
			const nodeName = getName(originNode.openingElement.name);
			const namespace = getNamespace(nodeName, parentNamespace);

			const hasSpreadAttr = '__hasSpreadAttribute' in originNode;

			const startTag: MLASTTag = {
				uuid: uuid(),
				...startTagLocation,
				nodeName,
				type: 'starttag',
				namespace,
				elementType: detectElementType(
					nodeName,
					options?.authoredElementName,
					/**
					 * @see https://reactjs.org/docs/jsx-in-depth.html#user-defined-components-must-be-capitalized
					 */
					/^[A-Z]|\./,
				),
				attributes: attrs.map(a => attr(a, rawHtml)),
				hasSpreadAttr,
				parentNode,
				prevNode,
				nextNode,
				pearNode: endTag,
				selfClosingSolidus: tagTokens.selfClosingSolidus,
				endSpace: tagTokens.afterAttrSpaces,
				// hasSpreadAttr,
				isFragment: false,
				isGhost: false,
				tagOpenChar: '<',
				tagCloseChar: '>',
				__parentId: originNode.__parentId ?? null,
			};
			if (endTag) {
				endTag.pearNode = startTag;
			}

			startTag.childNodes = traverse(originNode.children, startTag, rawHtml, options);

			return startTag;
		}
		case 'JSXFragment': {
			const startTagLocation = sliceFragment(
				rawHtml,
				originNode.openingFragment.range[0],
				originNode.openingFragment.range[1],
			);

			const endTagLocation = sliceFragment(
				rawHtml,
				originNode.closingFragment.range[0],
				originNode.closingFragment.range[1],
			);
			const endTagRaw = endTagLocation.raw;
			const endTagStartOffset = endTagLocation.startOffset;
			const endTagEndOffset = endTagLocation.endOffset;
			const endTag: MLASTElementCloseTag = {
				uuid: uuid(),
				raw: endTagRaw,
				startOffset: endTagStartOffset,
				endOffset: endTagEndOffset,
				startLine: endTagLocation.startLine,
				endLine: endTagLocation.endLine,
				startCol: endTagLocation.startCol,
				endCol: endTagLocation.endCol,
				nodeName: '#jsx-fragment',
				type: 'endtag',
				namespace: parentNamespace,
				attributes: [],
				parentNode,
				prevNode,
				nextNode,
				pearNode: null,
				isFragment: false,
				isGhost: false,
				tagOpenChar: '</',
				tagCloseChar: '>',
				__parentId: originNode.__parentId ?? null,
			};

			const startTag: MLASTTag = {
				uuid: uuid(),
				...startTagLocation,
				nodeName: '#jsx-fragment',
				type: 'starttag',
				namespace: parentNamespace,
				elementType: 'authored',
				attributes: [],
				hasSpreadAttr: false,
				parentNode,
				prevNode,
				nextNode,
				pearNode: endTag,
				// hasSpreadAttr,
				isFragment: false,
				isGhost: false,
				tagOpenChar: '<',
				tagCloseChar: '>',
				__parentId: originNode.__parentId ?? null,
			};

			endTag.pearNode = startTag;

			startTag.childNodes = traverse(originNode.children, startTag, rawHtml, options);

			return startTag;
		}
		default: {
			const { startOffset, endOffset, startLine, endLine, startCol, endCol, raw } = sliceFragment(
				rawHtml,
				originNode.range[0],
				originNode.range[1],
			);
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
				type: 'psblock',
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
				__parentId: originNode.__parentId ?? null,
			};
		}
	}
}
