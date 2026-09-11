import type {
	MLASTAttr,
	MLASTElement,
	MLASTHTMLAttr,
	MLASTNodeTreeItem,
	MLASTParentNode,
	MLASTText,
} from '@markuplint/ml-ast';
import type { ParserOptions, Token } from '@markuplint/parser-utils';
import type {
	Code,
	Definition,
	Image,
	ImageReference,
	InlineCode,
	Link,
	LinkReference,
	List,
	RootContent,
	Table,
} from 'mdast';

import { Parser, getNamespace } from '@markuplint/parser-utils';

type MdastNode = RootContent;

/**
 * Extends `Parser<MdastNode>` rather than `HtmlParser`: an earlier design
 * extended `HtmlParser` and treated Markdown as opaque psblock nodes, which
 * left Markdown constructs invisible to rules. Converting them to their HTML
 * equivalents (with synthesized attributes such as `src`/`alt` from
 * `![alt](src)`) is what makes Markdown content lintable.
 */

export abstract class MarkdownAwareParser extends Parser<MdastNode> {
	protected definitions = new Map<string, Definition>();

	/** Set by visitTableElement, read by nodeizeMarkdownNode for tableRow dispatch. */
	readonly #headerRowOffsets = new Set<number>();

	/** Set by tableRow processing, read by tableCell processing; reset to 'td' after each row. */
	#currentCellName: 'th' | 'td' = 'td';

	constructor(options?: ParserOptions) {
		super(options);
	}

	/**
	 * Must be called at the beginning of every `tokenize()` invocation to
	 * prevent definitions, header-row offsets, and cell-name state from
	 * leaking across successive `parse()` calls on the same parser instance.
	 */
	protected resetMarkdownState() {
		this.definitions.clear();
		this.#headerRowOffsets.clear();
		this.#currentCellName = 'td';
	}

	/**
	 * Disables whitespace and invalid-node exposure because Markdown
	 * generates only synthetic elements with no real HTML whitespace tokens.
	 */
	afterFlattenNodes(nodeList: readonly MLASTNodeTreeItem[]) {
		return super.afterFlattenNodes(nodeList, {
			exposeWhiteSpace: false,
			exposeInvalidNode: false,
		});
	}

	/**
	 * The attribute positions point to the element's own token range because
	 * Markdown syntax does not have discrete attribute source positions.
	 */
	protected createSyntheticAttr(name: string, value: string, token: Token): MLASTHTMLAttr {
		const emptyToken = this.createToken('', token.offset, token.line, token.col);
		const nameToken = this.createToken(name, token.offset, token.line, token.col);
		const valueToken = this.createToken(value, token.offset, token.line, token.col);
		const attrToken = this.createToken(`${name}="${value}"`, token.offset, token.line, token.col);

		return {
			...attrToken,
			type: 'attr',
			nodeName: name,
			spacesBeforeName: emptyToken,
			name: nameToken,
			spacesBeforeEqual: emptyToken,
			equal: this.createToken('=', token.offset, token.line, token.col),
			spacesAfterEqual: emptyToken,
			startQuote: this.createToken('"', token.offset, token.line, token.col),
			value: valueToken,
			endQuote: this.createToken('"', token.offset, token.line, token.col),
			isDuplicatable: false,
		};
	}

	protected visitMarkdownElement(
		token: Token,
		nodeName: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		childNodes: readonly MdastNode[],
		depth: number,
		parentNode: MLASTParentNode | null,
		attributes: readonly MLASTAttr[] = [],
	): readonly MLASTNodeTreeItem[] {
		const startTag: MLASTElement = {
			...token,
			...this.createToken(token),
			attributes: [...attributes],
			type: 'starttag',
			elementType: this.detectElementType(nodeName),
			namespace: getNamespace(nodeName, parentNode),
			childNodes: [],
			blockBehavior: null,
			depth,
			parentNode,
			parentNodeUuid: parentNode?.uuid ?? null,
			pairNode: null,
			pairNodeUuid: null,
			tagOpenChar: '',
			tagCloseChar: '',
			isGhost: false,
			isFragment: false,
			nodeName,
		};

		// Safe cast: childNodes are always subtypes of RootContent (= MdastNode)
		const siblings = this.visitChildren([...childNodes] as MdastNode[], startTag);

		return [startTag, ...siblings];
	}

	protected visitLinkElement(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Link,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const attrs: MLASTHTMLAttr[] = [this.createSyntheticAttr('href', originNode.url, token)];

		if (originNode.title != null) {
			attrs.push(this.createSyntheticAttr('title', originNode.title, token));
		}

		return this.visitMarkdownElement(token, 'a', originNode.children, depth, parentNode, attrs);
	}

	protected visitImageElement(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Image,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const attrs: MLASTHTMLAttr[] = [
			this.createSyntheticAttr('src', originNode.url, token),
			this.createSyntheticAttr('alt', originNode.alt ?? '', token),
		];

		if (originNode.title != null) {
			attrs.push(this.createSyntheticAttr('title', originNode.title, token));
		}

		return this.visitMarkdownElement(token, 'img', [], depth, parentNode, attrs);
	}

	protected visitListElement(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: List,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const nodeName = originNode.ordered ? 'ol' : 'ul';
		const attrs: MLASTHTMLAttr[] = [];

		if (originNode.ordered && originNode.start != null && originNode.start !== 1) {
			attrs.push(this.createSyntheticAttr('start', String(originNode.start), token));
		}

		return this.visitMarkdownElement(token, nodeName, originNode.children, depth, parentNode, attrs);
	}

	protected visitInlineCode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: InlineCode,
		token: Token,
		offset: number,
		endOffset: number,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const startTag: MLASTElement = {
			...token,
			...this.createToken(token),
			attributes: [],
			type: 'starttag',
			elementType: this.detectElementType('code'),
			namespace: getNamespace('code', parentNode),
			childNodes: [],
			blockBehavior: null,
			depth,
			parentNode,
			parentNodeUuid: parentNode?.uuid ?? null,
			pairNode: null,
			pairNodeUuid: null,
			tagOpenChar: '',
			tagCloseChar: '',
			isGhost: false,
			isFragment: false,
			nodeName: 'code',
		};

		const raw = this.rawCode.slice(offset, endOffset);
		const valueStart = raw.indexOf(originNode.value);
		// Defensive guard: if value cannot be found in raw source (e.g., whitespace-only code spans) or is empty
		if (valueStart === -1 || originNode.value.length === 0) {
			return [startTag];
		}

		const valueOffset = offset + valueStart;
		const valueEndOffset = valueOffset + originNode.value.length;
		const textToken = this.sliceFragment(valueOffset, valueEndOffset);

		const textNode: MLASTText = {
			...textToken,
			...this.createToken(textToken),
			type: 'text',
			depth: depth + 1,
			nodeName: '#text',
			parentNode: startTag,
			parentNodeUuid: startTag.uuid,
		};

		this.appendChild(startTag, textNode);

		return [startTag];
	}

	protected visitCodeBlock(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Code,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const preTag: MLASTElement = {
			...token,
			...this.createToken(token),
			attributes: [],
			type: 'starttag',
			elementType: this.detectElementType('pre'),
			namespace: getNamespace('pre', parentNode),
			childNodes: [],
			blockBehavior: null,
			depth,
			parentNode,
			parentNodeUuid: parentNode?.uuid ?? null,
			pairNode: null,
			pairNodeUuid: null,
			tagOpenChar: '',
			tagCloseChar: '',
			isGhost: false,
			isFragment: false,
			nodeName: 'pre',
		};

		const codeAttrs: MLASTHTMLAttr[] = [];
		if (originNode.lang) {
			codeAttrs.push(this.createSyntheticAttr('class', `language-${originNode.lang}`, token));
		}

		const codeTag: MLASTElement = {
			...token,
			...this.createToken(token),
			attributes: codeAttrs,
			type: 'starttag',
			elementType: this.detectElementType('code'),
			namespace: getNamespace('code', preTag),
			childNodes: [],
			blockBehavior: null,
			depth: depth + 1,
			parentNode: preTag,
			parentNodeUuid: preTag.uuid,
			pairNode: null,
			pairNodeUuid: null,
			tagOpenChar: '',
			tagCloseChar: '',
			isGhost: false,
			isFragment: false,
			nodeName: 'code',
		};

		if (originNode.value.length > 0) {
			const position = originNode.position;
			if (position) {
				const rawContent = this.rawCode.slice(position.start.offset ?? 0, position.end.offset ?? 0);
				const valueStart = rawContent.indexOf(originNode.value);
				if (valueStart !== -1) {
					const valueOffset = (position.start.offset ?? 0) + valueStart;
					const valueEndOffset = valueOffset + originNode.value.length;
					const textToken = this.sliceFragment(valueOffset, valueEndOffset);

					const textNode: MLASTText = {
						...textToken,
						...this.createToken(textToken),
						type: 'text',
						depth: depth + 2,
						nodeName: '#text',
						parentNode: codeTag,
						parentNodeUuid: codeTag.uuid,
					};

					this.appendChild(codeTag, textNode);
				}
			}
		}

		this.appendChild(preTag, codeTag);

		return [preTag, codeTag];
	}

	protected visitTableElement(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: Table,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const firstRow = originNode.children[0];
		if (firstRow?.position?.start.offset != null) {
			this.#headerRowOffsets.add(firstRow.position.start.offset);
		}

		return this.visitMarkdownElement(token, 'table', originNode.children as MdastNode[], depth, parentNode);
	}

	/**
	 * Returns `null` when the node type is not handled here, signalling that
	 * the caller must handle it (typically `text`, `html`, or parser-specific
	 * node types).
	 */
	protected nodeizeMarkdownNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: MdastNode,
		token: Token,
		offset: number,
		endOffset: number,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] | null {
		switch (originNode.type) {
			case 'heading': {
				const nodeName = `h${originNode.depth}`;
				return this.visitMarkdownElement(token, nodeName, originNode.children, depth, parentNode);
			}
			case 'paragraph': {
				return this.visitMarkdownElement(token, 'p', originNode.children, depth, parentNode);
			}
			case 'emphasis': {
				return this.visitMarkdownElement(token, 'em', originNode.children, depth, parentNode);
			}
			case 'strong': {
				return this.visitMarkdownElement(token, 'strong', originNode.children, depth, parentNode);
			}
			case 'link': {
				return this.visitLinkElement(originNode, token, depth, parentNode);
			}
			case 'image': {
				return this.visitImageElement(originNode, token, depth, parentNode);
			}
			case 'list': {
				return this.visitListElement(originNode, token, depth, parentNode);
			}
			case 'listItem': {
				return this.visitMarkdownElement(token, 'li', originNode.children, depth, parentNode);
			}
			case 'blockquote': {
				// Markdown's `> quote` syntax has no equivalent of the HTML
				// `cite` attribute, so no `cite` attribute is synthesized.
				return this.visitMarkdownElement(token, 'blockquote', originNode.children, depth, parentNode);
			}
			case 'thematicBreak': {
				return this.visitMarkdownElement(token, 'hr', [], depth, parentNode);
			}
			case 'break': {
				return this.visitMarkdownElement(token, 'br', [], depth, parentNode);
			}
			case 'inlineCode': {
				return this.visitInlineCode(originNode, token, offset, endOffset, depth, parentNode);
			}
			case 'code': {
				return this.visitCodeBlock(originNode, token, depth, parentNode);
			}
			case 'linkReference': {
				return this.#visitLinkReference(originNode, token, depth, parentNode);
			}
			case 'imageReference': {
				return this.#visitImageReference(originNode, token, depth, parentNode);
			}
			case 'table': {
				return this.visitTableElement(originNode, token, depth, parentNode);
			}
			case 'tableRow': {
				const isHeader = this.#headerRowOffsets.delete(offset);
				if (isHeader) {
					this.#currentCellName = 'th';
				}
				// tableRow.children is TableCell[] — safely widens to MdastNode[]
				const result = this.visitMarkdownElement(
					token,
					'tr',
					originNode.children as MdastNode[],
					depth,
					parentNode,
				);
				this.#currentCellName = 'td';
				return result;
			}
			case 'tableCell': {
				return this.visitMarkdownElement(
					token,
					this.#currentCellName,
					originNode.children as MdastNode[],
					depth,
					parentNode,
				);
			}
			case 'delete': {
				return this.visitMarkdownElement(token, 'del', originNode.children as MdastNode[], depth, parentNode);
			}
			case 'yaml':
			case 'definition':
			case 'footnoteReference':
			case 'footnoteDefinition': {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: originNode.type,
					isFragment: false,
				});
			}
			case 'text': {
				// Caller handles text nodes directly
				return null;
			}
			default: {
				// null = the caller is responsible for handling this node type
				return null;
			}
		}
	}

	/**
	 * Note: remark-parse resolves references at parse time when definitions
	 * exist, so unresolved references typically appear as plain text rather
	 * than `linkReference` nodes; the psblock fallback is a defensive path.
	 */
	#visitLinkReference(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: LinkReference,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const def = this.definitions.get(originNode.identifier);
		if (!def) {
			return this.visitPsBlock({
				...token,
				depth,
				parentNode,
				nodeName: 'linkReference',
				isFragment: false,
			});
		}

		const attrs: MLASTHTMLAttr[] = [this.createSyntheticAttr('href', def.url, token)];
		if (def.title != null) {
			attrs.push(this.createSyntheticAttr('title', def.title, token));
		}

		return this.visitMarkdownElement(token, 'a', originNode.children as MdastNode[], depth, parentNode, attrs);
	}

	/**
	 * Note: as with linkReference, unresolved references typically appear as
	 * plain text in the mdast, so the psblock fallback is a defensive path.
	 */
	#visitImageReference(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: ImageReference,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const def = this.definitions.get(originNode.identifier);
		if (!def) {
			return this.visitPsBlock({
				...token,
				depth,
				parentNode,
				nodeName: 'imageReference',
				isFragment: false,
			});
		}

		const attrs: MLASTHTMLAttr[] = [
			this.createSyntheticAttr('src', def.url, token),
			this.createSyntheticAttr('alt', originNode.alt ?? '', token),
		];
		if (def.title != null) {
			attrs.push(this.createSyntheticAttr('title', def.title, token));
		}

		return this.visitMarkdownElement(token, 'img', [], depth, parentNode, attrs);
	}

	/**
	 * Per CommonMark spec, the first definition for a given identifier takes
	 * precedence. remark-parse emits all definition nodes in source order, so
	 * we skip duplicates via `Map.has` to honour the first-wins rule.
	 */
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	protected collectDefinitions(children: readonly RootContent[]) {
		for (const child of children) {
			if (child.type === 'definition' && !this.definitions.has(child.identifier)) {
				this.definitions.set(child.identifier, child);
			}
		}
	}
}

/**
 * Equivalent to `getPosition()` in `@markuplint/parser-utils`, but that
 * function is not exported from the package. Kept as a standalone utility
 * to avoid coupling to parser-utils internals.
 */
export function getLineAndColumn(source: string, offset: number): { line: number; col: number } {
	let line = 1;
	let col = 1;
	for (let i = 0; i < offset; i++) {
		if (source[i] === '\n') {
			line++;
			col = 1;
		} else {
			col++;
		}
	}
	return { line, col };
}
