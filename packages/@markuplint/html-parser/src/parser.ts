import type { Replacements } from './optimize-starts-head-or-body.js';
import type { Node } from './types.js';
import type { MLASTNodeTreeItem, MLASTParentNode, MLASTParseError } from '@markuplint/ml-ast';
import type { ChildToken, ParseOptions, ParserOptions } from '@markuplint/parser-utils';
import type { ParserError as Parse5ParserError } from 'parse5';

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

/**
 * Parser implementation for standard HTML, built on top of parse5.
 * Handles document and fragment parsing, ghost elements (omitted tags),
 * and optimizations for `<head>` / `<body>` tag handling.
 */
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

	tokenize(options?: ParseOptions): { ast: Node[]; isFragment: boolean; parseErrors: readonly MLASTParseError[] } {
		const mode = options?.documentMode ?? 'auto';
		const isFragment = mode === 'document' ? false : mode === 'fragment' ? true : isDocumentFragment(this.rawCode);
		const parseFn = isFragment ? parseFragment : parse;
		const collected: MLASTParseError[] = [];
		const rawCode = this.rawCode;
		const doc = parseFn(rawCode, {
			scriptingEnabled: false,
			sourceCodeLocationInfo: true,
			onParseError(error: Parse5ParserError) {
				const startOffset = error.startOffset;
				const endOffset = error.endOffset;
				collected.push({
					code: error.code,
					startOffset,
					startLine: error.startLine,
					startCol: error.startCol,
					endOffset,
					endLine: error.endLine,
					endCol: error.endCol,
					raw: extractRawForParseError(rawCode, startOffset, endOffset),
				});
			},
		});
		const childNodes = doc.childNodes;

		return {
			ast: childNodes,
			isFragment,
			parseErrors: collected,
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

/**
 * Default singleton instance of the HTML parser.
 */
export const parser = new HtmlParser();

/**
 * Returns a non-empty `raw` slice for a parse5 parse error.
 *
 * parse5 frequently reports parse errors at zero-width positions
 * (e.g., `duplicate-attribute` fires at the `=` between the attribute name
 * and its value, not over the name itself). A bare `rawCode.slice(start, end)`
 * on these positions yields the empty string, which leaves the reporter with
 * no excerpt to show the user.
 *
 * If the span is empty, fall back to the **token-shaped** substring around
 * `startOffset` — the run of non-whitespace, non-`<>"'/=` characters that
 * sits at that position. This is a best-effort heuristic: it surfaces the
 * attribute name, tag-name fragment, or character-reference body that
 * triggered the error, without claiming any specific spec semantics.
 *
 * Capped at 32 chars so a runaway slice (e.g., on `unexpected-null-character`
 * pointing into a long text node) does not bloat reporter output.
 */
export function extractRawForParseError(rawCode: string, startOffset: number, endOffset: number): string {
	if (endOffset > startOffset) {
		return rawCode.slice(startOffset, endOffset);
	}
	// Walk backwards from startOffset over token-shaped characters to find the
	// start of the surrounding token (attribute name, character reference,
	// etc.). Stop at any whitespace or HTML structural punctuation.
	let begin = startOffset;
	while (begin > 0 && !/[\s<>"'/=&]/.test(rawCode[begin - 1] ?? '')) {
		begin--;
	}
	// Walk forwards similarly to find the end.
	let end = startOffset;
	const max = Math.min(rawCode.length, startOffset + 32);
	while (end < max && !/[\s<>"'/=&]/.test(rawCode[end] ?? '')) {
		end++;
	}
	return rawCode.slice(begin, end);
}
