import type { Replacements } from './optimize-starts-head-or-body.js';
import type { Node } from './types.js';
import type { MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { ChildToken, ParseOptions, ParserOptions } from '@markuplint/parser-utils';

import { Parser } from '@markuplint/parser-utils';
import { parse, parseFragment } from 'parse5';

import { isDocumentFragment } from './is-document-fragment.js';
import {
	optimizeStartsHeadTagOrBodyTagResume,
	optimizeStartsHeadTagOrBodyTagSetup,
} from './optimize-starts-head-or-body.js';
import { getEndPosition } from '@markuplint/parser-utils/location';

type State = {
	startsHeadTagOrBodyTag: Replacements | null;
	afterPosition: {
		endOffset: number;
		endLine: number;
		endCol: number;
		depth: number;
	};
};

type ExtendsOptions = Pick<ParserOptions, 'ignoreTags' | 'maskChar'>;

export class HtmlParser extends Parser<Node, State> {
	constructor(options?: ExtendsOptions) {
		super(options, {
			startsHeadTagOrBodyTag: null,
			afterPosition: {
				endOffset: 0,
				endLine: 1,
				endCol: 1,
				depth: 0,
			},
		});
	}

	tokenize(): { ast: Node[]; isFragment: boolean } {
		const isFragment = isDocumentFragment(this.rawCode);
		const parseFn = isFragment ? parseFragment : parse;
		const doc = parseFn(this.rawCode, {
			scriptingEnabled: false,
			sourceCodeLocationInfo: true,
		});
		const childNodes = doc.childNodes;

		return {
			ast: childNodes,
			isFragment,
		};
	}

	beforeParse(rawCode: string, options?: ParseOptions) {
		rawCode = super.beforeParse(rawCode, options);
		const replacements = optimizeStartsHeadTagOrBodyTagSetup(rawCode);
		if (replacements?.code) {
			this.state.startsHeadTagOrBodyTag = replacements;
			return replacements.code;
		}
		this.state.afterPosition = {
			endOffset: (options?.offsetOffset ?? 0) + this.state.afterPosition.endOffset,
			endLine: (options?.offsetLine ?? 0) + this.state.afterPosition.endLine,
			endCol: (options?.offsetColumn ?? 0) + this.state.afterPosition.endCol,
			depth: this.state.afterPosition.depth,
		};
		return rawCode;
	}

	afterParse(nodeList: readonly MLASTNodeTreeItem[], options?: ParseOptions) {
		nodeList = super.afterParse(nodeList, options);
		if (this.state.startsHeadTagOrBodyTag) {
			return optimizeStartsHeadTagOrBodyTagResume(this, nodeList, this.state.startsHeadTagOrBodyTag);
		}
		return nodeList;
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Node,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const namespace = 'namespaceURI' in originNode ? originNode.namespaceURI : '';
		const location = originNode.sourceCodeLocation;

		if (!location) {
			// Ghost element
			const afterNode =
				this.state.afterPosition.depth === depth
					? this.state.afterPosition
					: parentNode
						? getEndPosition(parentNode.raw, parentNode.offset, parentNode.line, parentNode.col)
						: null;
			const offset = afterNode?.endOffset ?? 0;
			const line = afterNode?.endLine ?? 0;
			const col = afterNode?.endCol ?? 0;

			const childNodes = 'childNodes' in originNode ? originNode.childNodes : [];

			return this.visitElement(
				{
					raw: '',
					offset,
					line,
					col,
					depth,
					parentNode,
					nodeName: originNode.nodeName,
					namespace,
				},
				childNodes,
			);
		}

		const { startOffset, endOffset } = location;
		const token = this.sliceFragment(startOffset, endOffset ?? startOffset);

		switch (originNode.nodeName) {
			case '#documentType': {
				if (!('name' in originNode)) {
					throw new TypeError("DocumentType doesn't have name");
				}

				return this.visitDoctype({
					...token,
					depth,
					name: originNode.name ?? '',
					publicId: originNode.publicId ?? '',
					systemId: originNode.systemId ?? '',
					parentNode,
				});
			}
			case '#text': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case '#comment': {
				return this.visitComment({
					...token,
					depth,
					parentNode,
				});
			}
			default: {
				const tagLoc = 'startTag' in location ? location.startTag : null;

				const offset = tagLoc?.startOffset ?? startOffset;
				const endOffset = tagLoc?.endOffset ?? offset;

				const startTagToken = this.sliceFragment(offset, endOffset);

				const childNodes =
					'childNodes' in originNode
						? originNode.nodeName === 'template' && 'content' in originNode
							? originNode.content.childNodes
							: originNode.childNodes
						: [];

				return this.visitElement(
					{
						...startTagToken,
						depth,
						parentNode,
						nodeName: originNode.nodeName,
						namespace,
					},
					childNodes,
					{
						createEndTagToken: () => {
							const endTagLoc = 'endTag' in location ? location.endTag : null;
							if (!endTagLoc) {
								return null;
							}
							const { startOffset, endOffset } = endTagLoc;
							const endTagToken = this.sliceFragment(startOffset, endOffset);
							return {
								...endTagToken,
								depth,
								parentNode,
							};
						},
					},
				);
			}
		}
	}

	afterNodeize(siblings: readonly MLASTNodeTreeItem[], parentNode: MLASTParentNode | null, depth: number) {
		const after = super.afterNodeize(siblings, parentNode, depth);

		const prevNode = after.siblings.at(-1) ?? after.ancestors.findLast(n => n.depth === depth);
		if (prevNode) {
			const endPos = getEndPosition(prevNode.raw, prevNode.offset, prevNode.line, prevNode.col);
			this.state.afterPosition = {
				...endPos,
				depth,
			};
		}

		return after;
	}

	visitText(token: ChildToken) {
		return super.visitText(token, {
			researchTags: true,
			invalidTagAsText: true,
		});
	}

	visitSpreadAttr() {
		return null;
	}
}

export const parser = new HtmlParser();
