import type {
	IgnoreTag,
	SelfCloseType,
	Token,
	ChildToken,
	QuoteSet,
	ParseOptions,
	ParserOptions,
	Tokenized,
	ValueType,
} from './types.js';
import type {
	EndTagType,
	MLASTDocument,
	MLASTParentNode,
	MLParser,
	ParserAuthoredElementNameDistinguishing,
	MLASTElement,
	MLASTElementCloseTag,
	MLASTToken,
	MLASTNodeTreeItem,
	MLASTTag,
	MLASTText,
	MLASTDoctype,
	MLASTComment,
	MLASTAttr,
	MLASTChildNode,
	MLASTSpreadAttr,
	MLASTPreprocessorSpecificBlock,
	ElementType,
	MLASTInvalid,
	Walker,
	MLASTHTMLAttr,
	MLASTPreprocessorSpecificBlockConditionalType,
} from '@markuplint/ml-ast';

import { isVoidElement as detectVoidElement } from '@markuplint/ml-spec';
import { v4 as uuid } from 'uuid';

import { attrTokenizer } from './attr-tokenizer.js';
import { defaultSpaces } from './const.js';
import { domLog } from './debug.js';
import { detectElementType } from './detect-element-type.js';
import { AttrState, TagState } from './enums.js';
import { getEndCol, getEndLine, getPosition } from './get-location.js';
import { ignoreBlock, restoreNode } from './ignore-block.js';
import { ignoreFrontMatter } from './ignore-front-matter.js';
import { ParserError } from './parser-error.js';
import { sortNodes } from './sort-nodes.js';

export abstract class Parser<Node extends {} = {}, State extends unknown = null> implements MLParser {
	readonly #booleanish: boolean = false;
	readonly #defaultState: State;
	readonly #endTagType: EndTagType = 'omittable';
	readonly #ignoreTags: readonly IgnoreTag[] = [];
	readonly #maskChar?: string;
	readonly #tagNameCaseSensitive: boolean = false;
	readonly #selfCloseType: SelfCloseType = 'html';
	readonly #spaceChars: readonly string[] = defaultSpaces;
	readonly #rawTextElements: readonly string[] = ['style', 'script'];
	#authoredElementName?: ParserAuthoredElementNameDistinguishing;
	#originalRawCode = '';
	#rawCode = '';
	#defaultDepth = 0;
	#walkMethodSequentailPrevNode: MLASTNodeTreeItem | null = null;

	state: State;

	get authoredElementName() {
		return this.#authoredElementName;
	}

	/**
	 * Detect value as a true if its attribute is booleanish value and omitted.
	 *
	 * Ex:
	 * ```jsx
	 * <Component aria-hidden />
	 * ```
	 *
	 * In the above, the `aria-hidden` is `true`.
	 */
	get booleanish(): boolean {
		return this.#booleanish;
	}

	/**
	 * The end tag omittable type.
	 *
	 * - `"xml"`: Must need an end tag or must self-close
	 * - `"omittable"`: May omit
	 * - `"never"`: Never need
	 */
	get endTag(): EndTagType {
		return this.#endTagType;
	}

	get rawCode() {
		return this.#rawCode;
	}

	get tagNameCaseSensitive() {
		return this.#tagNameCaseSensitive;
	}

	constructor(options?: ParserOptions, defaultState?: State) {
		this.#booleanish = options?.booleanish ?? this.#booleanish;
		this.#endTagType = options?.endTagType ?? this.#endTagType;
		this.#ignoreTags = options?.ignoreTags ?? this.#ignoreTags;
		this.#maskChar = options?.maskChar ?? this.#maskChar;
		this.#tagNameCaseSensitive = options?.tagNameCaseSensitive ?? this.#tagNameCaseSensitive;
		this.#selfCloseType = options?.selfCloseType ?? this.#selfCloseType;
		this.#spaceChars = options?.spaceChars ?? this.#spaceChars;
		this.#rawTextElements = options?.rawTextElements ?? this.#rawTextElements;
		this.#defaultState = defaultState ?? (null as State);
		this.state = structuredClone(this.#defaultState);
	}

	tokenize(options?: ParseOptions): Tokenized<Node, State> {
		return {
			ast: [],
			isFragment: false,
		};
	}

	beforeParse(rawCode: string, options?: ParseOptions) {
		const spaces = this.#createOffsetSpaces(options);
		return spaces + rawCode;
	}

	parse(rawCode: string, options?: ParseOptions): MLASTDocument {
		try {
			// Initialize raw code
			this.#setRawCode(rawCode, rawCode);

			// Override raw code
			this.#setRawCode(this.beforeParse(this.rawCode, options));

			this.#authoredElementName = options?.authoredElementName;

			let frontMatter: string | null = null;
			if (options?.ignoreFrontMatter) {
				const fm = ignoreFrontMatter(this.rawCode);
				this.#setRawCode(fm.code);
				frontMatter = fm.frontMatter;
			}

			const blocks = ignoreBlock(this.rawCode, this.#ignoreTags, this.#maskChar);
			this.#setRawCode(blocks.replaced);

			const tokenized = this.tokenize(options);
			const ast = tokenized.ast;
			const isFragment = tokenized.isFragment;

			this.#defaultDepth = options?.depth ?? this.#defaultDepth;
			const traversed = this.traverse(ast, null, this.#defaultDepth);
			const nodeTree = this.afterTraverse([...traversed.childNodes, ...traversed.siblings]);

			let nodeList = this.flattenNodes(nodeTree);
			nodeList = this.afterFlattenNodes(nodeList);
			nodeList = restoreNode(this, nodeList, blocks, false);
			nodeList = this.afterParse(nodeList, options);

			if (frontMatter) {
				const newNodeList = [...nodeList];
				let firstText = '';
				const firstTextNode = newNodeList.shift();
				if (firstTextNode && firstTextNode.type === 'text') {
					firstText = firstTextNode.raw;
				} else if (firstTextNode) {
					newNodeList.unshift(firstTextNode);
				}
				const raw = frontMatter + firstText.slice(frontMatter.length);
				const token = this.sliceFragment(0, raw.length);
				const fmNode = this.visitPsBlock({
					...token,
					depth: 0,
					parentNode: null,
					raw,
					nodeName: 'front-matter',
					isFragment: false,
				})[0];
				if (!fmNode) {
					throw new ParserError('Unexpected front matter', firstTextNode ?? token);
				}
				nodeList = [fmNode, ...newNodeList];
			}

			domLog(nodeList);

			this.#reset();

			return {
				raw: rawCode,
				nodeList,
				isFragment,
			};
		} catch (error) {
			throw this.parseError(error);
		}
	}

	afterParse(nodeList: readonly MLASTNodeTreeItem[], options?: ParseOptions): readonly MLASTNodeTreeItem[] {
		return this.#removeOffsetSpaces(nodeList, options);
	}

	parseError(error: any): ParserError {
		return new ParserError(error, {
			line: error.line ?? error.lineNumber ?? 0,
			col: error.col ?? error.column ?? 0,
			raw: error.raw ?? this.rawCode,
			stack: error.stack,
		});
	}

	traverse(
		originNodes: readonly Node[],
		parentNode: MLASTParentNode | null = null,
		depth: number,
	): {
		childNodes: readonly MLASTChildNode[];
		siblings: readonly MLASTNodeTreeItem[];
	} {
		if (originNodes.length === 0) {
			return {
				childNodes: [],
				siblings: [],
			};
		}

		const childNodes: MLASTChildNode[] = [];
		const siblings: MLASTNodeTreeItem[] = [];

		for (const originNode of originNodes) {
			const nodes = this.nodeize(originNode, parentNode, depth);
			const after = this.afterNodeize(nodes, parentNode, depth);

			childNodes.push(...after.siblings);
			siblings.push(...after.ancestors);
		}

		return {
			childNodes,
			siblings,
		};
	}

	afterTraverse(nodeTree: readonly MLASTNodeTreeItem[]): readonly MLASTNodeTreeItem[] {
		return this.#siblingsCorrection(nodeTree);
	}

	nodeize(originNode: Node, parentNode: MLASTParentNode | null, depth: number): readonly MLASTNodeTreeItem[] {
		return [];
	}

	afterNodeize(
		siblings: readonly MLASTNodeTreeItem[],
		parentNode: MLASTParentNode | null,
		depth: number,
	): {
		siblings: MLASTChildNode[];
		ancestors: MLASTNodeTreeItem[];
	} {
		const newSiblings: MLASTChildNode[] = [];
		const ancestors: MLASTNodeTreeItem[] = [];

		for (const sibling of siblings) {
			if (sibling.type === 'doctype') {
				if (sibling.depth === 0) {
					ancestors.push(sibling);
					continue;
				}
				throw new ParserError('Unexpected doctype', sibling);
			}

			if (sibling.depth === depth) {
				newSiblings.push(sibling);
				continue;
			}

			if (sibling.depth < depth) {
				ancestors.push(sibling);
				continue;
			}
		}

		return {
			siblings: newSiblings,
			ancestors,
		};
	}

	flattenNodes(nodeTree: readonly MLASTNodeTreeItem[]): readonly MLASTNodeTreeItem[] {
		return this.#arrayize(nodeTree);
	}

	afterFlattenNodes(
		nodeList: readonly MLASTNodeTreeItem[],
		options?: {
			readonly exposeInvalidNode?: boolean;
			readonly exposeWhiteSpace?: boolean;
			readonly concatText?: boolean;
		},
	): readonly MLASTNodeTreeItem[] {
		const exposeInvalidNode = options?.exposeInvalidNode ?? true;
		const exposeWhiteSpace = options?.exposeWhiteSpace ?? true;
		const concatText = options?.concatText ?? true;

		nodeList = this.#exposeRemnantNodes(nodeList, exposeInvalidNode, exposeWhiteSpace);
		nodeList = this.#orphanEndTagToBogusMark(nodeList);
		if (concatText) {
			nodeList = this.#concatText(nodeList);
		}
		nodeList = this.#trimText(nodeList);
		return nodeList;
	}

	visitDoctype(
		token: ChildToken & {
			readonly name: string;
			readonly publicId: string;
			readonly systemId: string;
		},
	): readonly MLASTNodeTreeItem[] {
		const node: MLASTDoctype = {
			...token,
			...this.createToken(token),
			type: 'doctype',
			nodeName: '#doctype',
		};
		return [node];
	}

	visitComment(
		token: ChildToken,
		options?: {
			readonly isBogus?: boolean;
		},
	): readonly MLASTNodeTreeItem[] {
		const isBogus = options?.isBogus ?? !token.raw.startsWith('<!--');
		const node: MLASTComment = {
			...token,
			...this.createToken(token),
			type: 'comment',
			nodeName: '#comment',
			isBogus,
		};
		return [node];
	}

	visitText(
		token: ChildToken,
		options?: {
			readonly researchTags?: boolean;
			readonly invalidTagAsText?: boolean;
		},
	): readonly MLASTNodeTreeItem[] {
		const node: MLASTText = {
			...token,
			...this.createToken(token),
			type: 'text',
			nodeName: '#text',
		};

		if (options?.researchTags) {
			const nodes = this.parseCodeFragment(token);
			const includedStartTags = nodes.some(node => node.type === 'starttag');

			// Handle invalid tags as text nodes
			if (options.invalidTagAsText && includedStartTags) {
				return [node];
			}

			return nodes;
		}

		return [node];
	}

	visitElement(
		token: ChildToken & {
			readonly nodeName: string;
			readonly namespace: string;
		},
		childNodes: readonly Node[] = [],
		options?: {
			readonly createEndTagToken?: (startTag: MLASTElement) => ChildToken | null;
			readonly namelessFragment?: boolean;
			readonly overwriteProps?: Partial<MLASTElement>;
		},
	): readonly MLASTNodeTreeItem[] {
		const createEndTagToken = options?.createEndTagToken;
		const namelessFragment = options?.namelessFragment ?? false;
		const overwriteProps = options?.overwriteProps;

		// Handle omitted empty tag as ghost element node
		if (token.raw === '') {
			const startTag: MLASTElement = {
				...token,
				...this.createToken(token),
				type: 'starttag',
				elementType: 'html',
				attributes: [],
				childNodes: [],
				parentNode: token.parentNode,
				pairNode: null,
				tagCloseChar: '',
				tagOpenChar: '',
				isGhost: true,
				isFragment: false,
				...overwriteProps,
			};

			const siblings = this.visitChildren(childNodes, startTag);

			return [startTag, ...siblings];
		}

		const startTag = {
			...this.#parseStartTag(
				token,
				{
					namespace: token.namespace,
					...overwriteProps,
				},
				namelessFragment,
			),
		};

		const siblings = this.visitChildren(childNodes, startTag);

		if (createEndTagToken) {
			const endTagToken = createEndTagToken(startTag);

			if (endTagToken) {
				const endTag = this.#parseEndTag(endTagToken, namelessFragment);

				this.#pairing(startTag, endTag);

				return [startTag, endTag, ...siblings];
			}
		}

		return [startTag, ...siblings];
	}

	visitPsBlock(
		token: ChildToken & {
			readonly nodeName: string;
			readonly isFragment: boolean;
		},
		childNodes: readonly Node[] = [],
		conditionalType: MLASTPreprocessorSpecificBlockConditionalType = null,
		originBlockNode?: Node,
	): readonly MLASTNodeTreeItem[] {
		const block: MLASTPreprocessorSpecificBlock = {
			...token,
			...this.createToken(token),
			type: 'psblock',
			conditionalType,
			nodeName: `#ps:${token.nodeName}`,
			childNodes: [],
			isBogus: false,
		};

		const siblings = this.visitChildren(childNodes, block);

		return [block, ...siblings];
	}

	visitChildren(children: readonly Node[], parentNode: MLASTParentNode | null): readonly MLASTNodeTreeItem[] {
		if (children.length === 0) {
			return [];
		}
		if (parentNode && this.#rawTextElements.includes(parentNode.nodeName.toLowerCase())) {
			return [];
		}

		const traversed = this.traverse(children, parentNode, parentNode ? parentNode.depth + 1 : 0);

		this.appendChild(parentNode, ...traversed.childNodes);

		return traversed.siblings;
	}

	visitSpreadAttr(token: Token): MLASTSpreadAttr | null {
		const raw = token.raw.trim();

		if (raw === '') {
			return null;
		}

		// eslint-disable-next-line regexp/strict
		if (!/^{\s*\.{3}[^.]/.test(raw)) {
			return null;
		}

		if (!raw.endsWith('}')) {
			return null;
		}

		const node = this.createToken(raw, token.startOffset, token.startLine, token.startCol);

		return {
			...node,
			...this.#getEndLocation(node),
			type: 'spread',
			nodeName: '#spread',
		};
	}

	visitAttr(
		token: Token,
		options?: {
			readonly quoteSet?: readonly QuoteSet[];
			readonly noQuoteValueType?: ValueType;
			readonly endOfUnquotedValueChars?: readonly string[];
			readonly startState?: AttrState;
		},
	): MLASTAttr & { __rightText?: string } {
		const raw = token.raw;

		const quoteSet = options?.quoteSet;
		const startState = options?.startState ?? AttrState.BeforeName;
		const noQuoteValueType = options?.noQuoteValueType;
		const endOfUnquotedValueChars = options?.endOfUnquotedValueChars;

		let startOffset = token.startOffset;
		let startLine = token.startLine;
		let startCol = token.startCol;

		let tokens: ReturnType<typeof attrTokenizer>;
		try {
			tokens = attrTokenizer(raw, quoteSet, startState, noQuoteValueType, endOfUnquotedValueChars);
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new ParserError(error.message, token);
			}
			throw error;
		}

		const spacesBeforeName = this.createToken(tokens.spacesBeforeAttrName, startOffset, startLine, startCol);
		startLine = spacesBeforeName.endLine;
		startCol = spacesBeforeName.endCol;
		startOffset = spacesBeforeName.endOffset;

		const name = this.createToken(tokens.attrName, startOffset, startLine, startCol);
		startLine = name.endLine;
		startCol = name.endCol;
		startOffset = name.endOffset;

		const spacesBeforeEqual = this.createToken(tokens.spacesBeforeEqual, startOffset, startLine, startCol);
		startLine = spacesBeforeEqual.endLine;
		startCol = spacesBeforeEqual.endCol;
		startOffset = spacesBeforeEqual.endOffset;

		const equal = this.createToken(tokens.equal, startOffset, startLine, startCol);
		startLine = equal.endLine;
		startCol = equal.endCol;
		startOffset = equal.endOffset;

		const spacesAfterEqual = this.createToken(tokens.spacesAfterEqual, startOffset, startLine, startCol);
		startLine = spacesAfterEqual.endLine;
		startCol = spacesAfterEqual.endCol;
		startOffset = spacesAfterEqual.endOffset;

		const startQuote = this.createToken(tokens.quoteStart, startOffset, startLine, startCol);
		startLine = startQuote.endLine;
		startCol = startQuote.endCol;
		startOffset = startQuote.endOffset;

		const value = this.createToken(tokens.attrValue, startOffset, startLine, startCol);
		startLine = value.endLine;
		startCol = value.endCol;
		startOffset = value.endOffset;

		const endQuote = this.createToken(tokens.quoteEnd, startOffset, startLine, startCol);

		const attrToken = this.createToken(
			tokens.attrName +
				tokens.spacesBeforeEqual +
				tokens.equal +
				tokens.spacesAfterEqual +
				tokens.quoteStart +
				tokens.attrValue +
				tokens.quoteEnd,
			name.startOffset,
			name.startLine,
			name.startCol,
		);

		const htmlAttr: MLASTAttr = {
			...attrToken,
			type: 'attr',
			nodeName: name.raw,
			spacesBeforeName,
			name,
			spacesBeforeEqual,
			equal,
			spacesAfterEqual,
			startQuote,
			value,
			endQuote,
			isDuplicatable: false,
		};

		const spread = this.visitSpreadAttr(attrToken);

		if (tokens.leftover) {
			return {
				...(spread ?? htmlAttr),
				__rightText: tokens.leftover,
			};
		}

		return spread ?? htmlAttr;
	}

	parseCodeFragment(
		token: ChildToken,
		options?: {
			readonly namelessFragment?: boolean;
		},
	) {
		const nodes: (MLASTTag | MLASTText)[] = [];

		let raw = token.raw;
		let startOffset = token.startOffset;
		let startLine = token.startLine;
		let startCol = token.startCol;
		let depth = token.depth;

		const depthStack = new Map<
			// Tag name
			string,
			// Depth
			number
		>();

		while (raw) {
			const parsed = this.#parseTag(
				{
					raw,
					startOffset,
					startLine,
					startCol,
					depth,
					parentNode: null,
				},
				true,
				true,
				options?.namelessFragment ?? false,
			);

			if (parsed.__left) {
				const token = this.createToken(parsed.__left, startOffset, startLine, startCol);
				const textNode: MLASTText = {
					...token,
					type: 'text',
					depth,
					nodeName: '#text',
					parentNode: null,
				};
				nodes.push(textNode);
			}

			raw = parsed.__right ?? '';

			if (!parsed.token) {
				continue;
			}

			const tag = parsed.token;

			startLine = tag.endLine;
			startCol = tag.endCol;
			startOffset = tag.endOffset;

			let isSelfClose = tag.type === 'starttag' && tag.selfClosingSolidus?.raw === '/';
			const isVoidElement = detectVoidElement({ localName: tag.nodeName.toLowerCase() });

			switch (this.#selfCloseType) {
				case 'html': {
					isSelfClose = isVoidElement;
					break;
				}
				case 'html+xml': {
					isSelfClose = isSelfClose || isVoidElement;
					break;
				}
				case 'xml': {
					// eslint-disable-next-line no-self-assign
					isSelfClose = isSelfClose;
					break;
				}
			}

			if (tag.type === 'starttag' && !isSelfClose) {
				depthStack.set(tag.nodeName, depth);
			}

			if (tag.raw) {
				if (tag.type === 'endtag') {
					if (depthStack.has(tag.nodeName)) {
						depth = depthStack.get(tag.nodeName)!;
						depthStack.delete(tag.nodeName);
					} else {
						depth = Math.max(depth - 1, this.#defaultDepth);
					}
					this.updateLocation(tag, {
						depth,
					});
				} else if (!isSelfClose) {
					depth += 1;
				}

				/**
				 * The DOM parser sometimes includes HTML closing tags as a text node child of the body element.
				 * In that case, it is ignored.
				 */
				if (token.parentNode?.nodeName === 'body' && tag.nodeName === 'html' && tag.type === 'endtag') {
					continue;
				}

				nodes.push(tag);
			}
		}
		return nodes;
	}

	updateLocation(
		node: MLASTNodeTreeItem,
		props: Partial<Pick<MLASTNodeTreeItem, 'startOffset' | 'startLine' | 'startCol' | 'depth'>>,
	) {
		Object.assign(node, {
			startOffset: props.startOffset ?? node.startOffset,
			startLine: props.startLine ?? node.startLine,
			startCol: props.startCol ?? node.startCol,
			endOffset: props.startOffset == null ? node.endOffset : props.startOffset + node.raw.length,
			endLine: props.startLine == null ? node.endLine : getEndLine(node.raw, props.startLine),
			endCol: props.startCol == null ? node.endCol : getEndCol(node.raw, props.startCol),
			depth: props.depth ?? node.depth,
		});
	}

	/**
	 * Set new raw code to target node.
	 *
	 * Replace the raw code and update the start/end offset/line/column.
	 *
	 * @param node target node
	 * @param raw new raw code
	 */
	updateRaw(node: MLASTToken, raw: string) {
		const startOffset = node.startOffset;
		const startLine = node.startLine;
		const startCol = node.startCol;
		const endOffset = startOffset + raw.length;
		const endLine = getEndLine(raw, startLine);
		const endCol = getEndCol(raw, startCol);

		Object.assign(node, {
			raw,
			startOffset,
			endOffset,
			startLine,
			endLine,
			startCol,
			endCol,
		});
	}

	updateElement(el: MLASTElement, props: Partial<Pick<MLASTElement, 'nodeName' | 'elementType'>>): void;
	updateElement(el: MLASTElementCloseTag, props: Partial<Pick<MLASTElementCloseTag, 'nodeName'>>): void;
	updateElement(el: MLASTTag, props: Partial<Pick<MLASTElement, 'nodeName' | 'elementType'>>): void {
		Object.assign(el, props);
	}

	updateAttr(
		attr: MLASTHTMLAttr,
		props: Partial<
			Pick<
				MLASTHTMLAttr,
				| 'isDynamicValue'
				| 'isDirective'
				| 'potentialName'
				| 'potentialValue'
				| 'valueType'
				| 'candidate'
				| 'isDuplicatable'
			>
		>,
	) {
		Object.assign(attr, props);
	}

	detectElementType(nodeName: string, defaultPattern?: ParserAuthoredElementNameDistinguishing): ElementType {
		return detectElementType(nodeName, this.#authoredElementName, defaultPattern);
	}

	createToken(token: Token): MLASTToken;
	createToken(token: string, startOffset: number, startLine: number, startCol: number): MLASTToken;
	createToken(token: string | Token, startOffset?: number, startLine?: number, startCol?: number): MLASTToken {
		const props =
			typeof token === 'string'
				? {
						raw: token,
						startOffset: startOffset ?? 0,
						startLine: startLine ?? 1,
						startCol: startCol ?? 1,
					}
				: token;

		return {
			uuid: uuid().slice(0, 8),
			...props,
			...this.#getEndLocation(props),
		};
	}

	sliceFragment(start: number, end?: number): Token {
		const raw = this.rawCode.slice(start, end);
		const { line, column } = getPosition(this.rawCode, start);
		return {
			raw,
			startOffset: start,
			startLine: line,
			startCol: column,
		};
	}

	getOffsetsFromCode(startLine: number, startCol: number, endLine: number, endCol: number) {
		const lines = this.#rawCode.split('\n');
		let offset = 0;
		let endOffset = 0;

		for (let i = 0; i < startLine - 1; i++) {
			const line = lines[i];
			if (line == null) {
				continue;
			}
			offset += line.length + 1;
		}

		offset += startCol - 1;

		for (let i = 0; i < endLine - 1; i++) {
			const line = lines[i];
			if (line == null) {
				continue;
			}
			endOffset += line.length + 1;
		}

		endOffset += endCol - 1;

		return { offset, endOffset };
	}

	walk<Node extends MLASTNodeTreeItem>(nodeList: readonly Node[], walker: Walker<Node>, depth = 0) {
		for (const node of nodeList) {
			walker(node, this.#walkMethodSequentailPrevNode, depth);
			this.#walkMethodSequentailPrevNode = node;
			if ('childNodes' in node && node.childNodes.length > 0) {
				this.walk(node.childNodes as Node[], walker, depth + 1);
			}
		}
		if (depth === 0) {
			this.#walkMethodSequentailPrevNode = null;
		}
	}

	appendChild(parentNode: MLASTParentNode | null, ...childNodes: readonly MLASTChildNode[]) {
		if (!parentNode || childNodes.length === 0) {
			return;
		}

		const newChildNodes = [...parentNode.childNodes];

		for (const appendingChild of childNodes) {
			const currentIndex = parentNode.childNodes.findIndex(n => n.uuid === appendingChild.uuid);

			Object.assign(appendingChild, { parentNode });

			if (currentIndex === -1) {
				newChildNodes.push(appendingChild);
				continue;
			}

			newChildNodes.splice(currentIndex, 1, appendingChild);
		}

		Object.assign(parentNode, {
			childNodes: this.#siblingsCorrection(newChildNodes),
		});
	}

	replaceChild(
		parentNode: MLASTParentNode,
		oldChildNode: MLASTChildNode,
		...replacementChildNodes: readonly MLASTChildNode[]
	) {
		const index = parentNode.childNodes.findIndex(childNode => childNode.uuid === oldChildNode.uuid);
		if (index === -1) {
			return;
		}
		if (Array.prototype.toSpliced == null) {
			const newChildNodes = [...parentNode.childNodes];
			// TODO: Use splice instead of toSpliced until we end support for Node 18
			newChildNodes.splice(index, 1, ...replacementChildNodes);
			Object.assign(parentNode, { childNodes: newChildNodes });
			return;
		}
		const newChildNodes = parentNode.childNodes.toSpliced(index, 1, ...replacementChildNodes);
		Object.assign(parentNode, { childNodes: newChildNodes });
	}

	#arrayize(nodeTree: readonly MLASTNodeTreeItem[]) {
		let nodeList: MLASTNodeTreeItem[] = [];

		this.walk(nodeTree, node => {
			nodeList.push(node);
		});

		nodeList = this.#removeDeprecatedNode(nodeList);

		return nodeList;
	}

	#concatText(nodeList: readonly MLASTNodeTreeItem[]) {
		const newNodeList: MLASTNodeTreeItem[] = [];
		for (const node of nodeList) {
			const prevNode = newNodeList.at(-1) ?? null;
			if (
				prevNode?.type === 'text' &&
				prevNode?.nodeName === '#text' &&
				node.type === 'text' &&
				node.nodeName === '#text' &&
				prevNode?.endOffset === node.startOffset
			) {
				const newNode = this.#concatTextNodes(prevNode, node);
				newNodeList.pop();
				newNodeList.push(newNode);
				continue;
			}
			newNodeList.push(node);
		}
		return newNodeList;
	}

	#concatTextNodes(...nodes: readonly MLASTText[]) {
		if (nodes.length === 0) {
			throw new Error('Empty node list');
		}

		const firstNode = nodes.at(0)!;
		const lastNode = nodes.at(-1)!;

		if (firstNode.uuid === lastNode.uuid) {
			return firstNode;
		}

		const textNode: MLASTText = {
			...firstNode,
			uuid: uuid().slice(0, 8),
			raw: nodes.map(n => n.raw).join(''),
			endOffset: lastNode.endOffset,
			endLine: lastNode.endLine,
			endCol: lastNode.endCol,
		};

		for (const node of nodes) {
			this.#removeChild(node.parentNode, node);
		}

		this.appendChild(textNode.parentNode, textNode);

		return textNode;
	}

	#convertIntoInvalidNode(node: MLASTChildNode): MLASTInvalid {
		if (node.type === 'invalid') {
			return node;
		}
		return {
			...node,
			type: 'invalid',
			nodeName: '#invalid',
			isBogus: true,
			kind: node.type,
		};
	}

	#createOffsetSpaces(options?: ParseOptions): string {
		const offsetOffset = Math.max(options?.offsetOffset ?? 0, 0);
		const offsetLine = Math.max((options?.offsetLine ?? 0) - 1, 0);
		const offsetColumn = Math.max((options?.offsetColumn ?? 0) - 1, 0);

		const offsetSpaces = ' '.repeat(offsetOffset - offsetLine - offsetColumn);
		const offsetLines = '\n'.repeat(offsetLine);
		const offsetColumns = ' '.repeat(offsetColumn);

		return offsetSpaces + offsetLines + offsetColumns;
	}

	#createRemnantNode(
		start: number,
		end: number | undefined,
		depth: number,
		parentNode: MLASTParentNode | null,
		exposeInvalidNode: boolean,
		exposeWhitespace: boolean,
	) {
		const codeFragment = this.sliceFragment(start, end);

		if (codeFragment.raw) {
			const remnantNodes = this.visitText(
				{
					...codeFragment,
					depth: depth,
					parentNode: parentNode,
				},
				{ researchTags: true },
			).filter((node: MLASTNodeTreeItem): node is MLASTChildNode => 'parentNode' in node);

			if (remnantNodes.length > 1) {
				this.appendChild(parentNode, ...remnantNodes);
				return remnantNodes;
			}

			const remnantNode = remnantNodes[0];
			if (!remnantNode) {
				return null;
			}

			if (exposeInvalidNode && remnantNode.raw.trim() !== '') {
				const invalidNode = this.#convertIntoInvalidNode(remnantNode);
				this.appendChild(parentNode, invalidNode);
				return [remnantNode];
			}

			if (exposeWhitespace && remnantNode.type === 'text' && remnantNode.raw.trim() === '') {
				this.appendChild(parentNode, remnantNode);
				return [remnantNode];
			}
		}
		return null;
	}

	#exposeRemnantNodes(nodeList: readonly MLASTNodeTreeItem[], invalidNode: boolean, whitespace: boolean) {
		if (!invalidNode && !whitespace) {
			return nodeList;
		}

		const newNodeList: MLASTNodeTreeItem[] = [];
		for (const [i, node] of nodeList.entries()) {
			const sequentailPrevNode = nodeList[i - 1] ?? null;

			if (!this.#rawTextElements.includes(node.nodeName.toLowerCase())) {
				const endOffset = sequentailPrevNode?.endOffset ?? 0;
				const remnantNodes = this.#createRemnantNode(
					endOffset,
					node.startOffset,
					node.depth,
					node.parentNode,
					invalidNode,
					whitespace,
				);

				if (remnantNodes) {
					newNodeList.push(...remnantNodes);
				}
			}

			newNodeList.push(node);
		}

		const lastNode = newNodeList.at(-1);
		if (!lastNode) {
			return newNodeList;
		}

		const remnantNodes = this.#createRemnantNode(
			lastNode.endOffset,
			undefined,
			lastNode.depth,
			lastNode.parentNode,
			invalidNode,
			whitespace,
		);

		if (!remnantNodes) {
			return newNodeList;
		}

		newNodeList.push(...remnantNodes);

		return newNodeList;
	}

	#getEndLocation(token: Token) {
		const endOffset = token.startOffset + token.raw.length;
		return {
			endOffset,
			endLine: getEndLine(token.raw, token.startLine),
			endCol: getEndCol(token.raw, token.startCol),
		} as const;
	}

	#orphanEndTagToBogusMark(nodeList: readonly MLASTNodeTreeItem[]) {
		const newNodeList: MLASTNodeTreeItem[] = [];
		for (let node of nodeList) {
			if (node.type === 'endtag') {
				const endTagUUID = node.uuid;
				const openTag = newNodeList.findLast<MLASTElement>((n): n is MLASTElement =>
					n.type === 'starttag' && !n.isGhost ? n.pairNode?.uuid === endTagUUID : false,
				);
				if (!openTag) {
					node = this.#convertIntoInvalidNode(node);
				}
			}
			newNodeList.push(node);
		}
		return newNodeList;
	}

	#pairing(startTag: MLASTElement, endTag: MLASTElementCloseTag, appendChild = true) {
		Object.assign(startTag, { pairNode: endTag });
		Object.assign(endTag, { pairNode: startTag });
		if (!appendChild) {
			return;
		}
		this.appendChild(startTag.parentNode, endTag);
	}

	#parseEndTag(token: ChildToken, namelessFragment: boolean): MLASTElementCloseTag {
		const parsed = this.#parseTag(token, true, false, namelessFragment);

		if (!parsed.token || parsed.token.type !== 'endtag') {
			throw new ParserError("Expected end tag but it's not end tag", token);
		}

		return parsed.token;
	}

	#parseStartTag(token: ChildToken, overwriteProps: Partial<MLASTElement>, namelessFragment: boolean): MLASTElement {
		const parsed = this.#parseTag(token, true, false, namelessFragment);

		if (!parsed.token || parsed.token.type !== 'starttag') {
			throw new ParserError("Expected start tag but it's not start tag", token);
		}

		const startTag: MLASTElement = {
			...parsed.token,
			...overwriteProps,
		};

		this.appendChild(token.parentNode, startTag);
		return startTag;
	}

	#parseTag(token: ChildToken, praseAttr: boolean, failSafe: boolean, namelessFragment: boolean) {
		const raw = token.raw;
		const depth = token.depth;
		const initialOffset = token.startOffset;
		const initialLine = token.startLine;
		const initialCol = token.startCol;

		let offset = initialOffset;
		let line = initialLine;
		let col = initialCol;

		let tagStartOffset = offset;
		let tagStartLine = line;
		let tagStartCol = col;

		let state: TagState = TagState.BeforeOpenTag;
		let beforeOpenTagChars = '';
		let tagName = '';
		let afterAttrsSpaceChars = '';
		let selfClosingSolidusChar = '';
		let isOpenTag = true;
		const attrs: MLASTAttr[] = [];

		const chars = [...raw];
		while (chars.length > 0) {
			if (state === TagState.AfterOpenTag) {
				break;
			}

			const char = chars.shift()!;

			stateSwitch: switch (state) {
				case TagState.BeforeOpenTag: {
					if (char === '<') {
						const beforeOpenTag = this.createToken(beforeOpenTagChars, offset, line, col);
						line = beforeOpenTag.endLine;
						col = beforeOpenTag.endCol;
						offset = beforeOpenTag.endOffset;

						tagStartOffset = offset;
						tagStartLine = line;
						tagStartCol = col;

						// Add `<` length
						col += 1;
						offset += 1;

						state = TagState.FirstCharOfTagName;
						break;
					}
					beforeOpenTagChars += char;
					break;
				}
				case TagState.FirstCharOfTagName: {
					if (/[a-z]/i.test(char)) {
						tagName += char;
						state = TagState.TagName;
						break;
					}
					if (char === '/') {
						isOpenTag = false;
						break;
					}
					if (namelessFragment && char === '>') {
						state = TagState.AfterOpenTag;
						break;
					}
					chars.unshift(char);
					state = TagState.AfterOpenTag;
					break;
				}
				case TagState.TagName: {
					if (this.#spaceChars.includes(char)) {
						chars.unshift(char);
						if (!isOpenTag) {
							// Add `/` of `</`(close tag) length
							offset += 1;
							col += 1;
						}
						offset += tagName.length;
						col += tagName.length;
						state = TagState.Attrs;
						break;
					}

					if (char === '/') {
						chars.unshift(char);
						state = TagState.AfterAttrs;
						break;
					}

					if (char === '>') {
						state = TagState.AfterOpenTag;
						break;
					}

					tagName += char;
					break;
				}
				case TagState.Attrs: {
					if (!praseAttr) {
						state = TagState.AfterAttrs;
						break stateSwitch;
					}

					let leftover = char + chars.join('');

					while (leftover.trim()) {
						if (leftover.trim().startsWith('/') || leftover.trim().startsWith('>')) {
							chars.length = 0;
							chars.push(...leftover);
							state = TagState.AfterAttrs;
							break stateSwitch;
						}

						const attr = this.visitAttr({
							raw: leftover,
							startOffset: offset,
							startLine: line,
							startCol: col,
						});

						line = attr.endLine;
						col = attr.endCol;
						offset = attr.endOffset;

						if (leftover === attr.__rightText) {
							throw new SyntaxError(`Invalid attribute syntax: ${leftover}`);
						}

						leftover = attr.__rightText == null ? '' : `${attr.__rightText}`;

						delete attr.__rightText;

						attrs.push(attr);
					}

					break;
				}
				case TagState.AfterAttrs: {
					if (char === '>') {
						state = TagState.AfterOpenTag;
						break;
					}

					if (this.#spaceChars.includes(char)) {
						afterAttrsSpaceChars += char;
						break;
					}

					if (char === '/') {
						selfClosingSolidusChar = char;
						break;
					}

					if (!praseAttr) {
						break;
					}

					throw new SyntaxError(`Invalid tag syntax: "${raw}"`);
				}
			}
		}

		const leftover = chars.join('');

		if (!failSafe && !leftover && state === TagState.TagName) {
			throw new SyntaxError(`Invalid tag syntax: "${raw}"`);
		}

		if (!failSafe && !namelessFragment && tagName === '') {
			throw new SyntaxError(`No tag name: "${raw}"`);
		}

		const endSpace = this.createToken(afterAttrsSpaceChars, offset, line, col);
		line = endSpace.endLine;
		col = endSpace.endCol;
		offset = endSpace.endOffset;

		const selfClosingSolidus = this.createToken(selfClosingSolidusChar, offset, line, col);
		line = selfClosingSolidus.endLine;
		col = selfClosingSolidus.endCol;
		offset = selfClosingSolidus.endOffset;

		const rawCodeFragment = raw.slice(beforeOpenTagChars.length, raw.length - leftover.length);

		if (!rawCodeFragment) {
			return {
				__left: beforeOpenTagChars,
				__right: leftover,
			};
		}

		const tagToken = this.createToken(rawCodeFragment, tagStartOffset, tagStartLine, tagStartCol);

		const isFragment = tagName === '';

		const commons = {
			depth,
			nodeName: isFragment ? '#jsx-fragment' : tagName,
			parentNode: null,
		};

		const tag: MLASTTag = isOpenTag
			? {
					...tagToken,
					...commons,
					type: 'starttag',
					elementType: this.detectElementType(tagName),
					namespace: '',
					attributes: attrs,
					childNodes: [],
					pairNode: null,
					tagOpenChar: '<',
					tagCloseChar: selfClosingSolidusChar + '>',
					selfClosingSolidus,
					isGhost: false,
					isFragment,
				}
			: {
					...tagToken,
					...commons,
					type: 'endtag',
					pairNode: {} as MLASTElement,
					tagOpenChar: '</',
					tagCloseChar: '>',
				};

		return {
			token: tag,
			__left: beforeOpenTagChars,
			__right: leftover,
		};
	}

	#removeChild(parentNode: MLASTParentNode | null, ...childNodes: readonly MLASTNodeTreeItem[]) {
		if (!parentNode || childNodes.length === 0) {
			return;
		}
		const newChildNodes = parentNode.childNodes.filter(n => !childNodes.includes(n));
		Object.assign(parentNode, { childNodes: newChildNodes });
	}

	/**
	 *
	 * @disruptive
	 * @param nodeOrders [Disruptive change]
	 */
	#removeDeprecatedNode(nodeOrders: readonly MLASTNodeTreeItem[]) {
		/**
		 * sorting
		 */
		const sorted =
			Array.prototype.toSorted == null
				? // TODO: Use sort instead of toSorted until we end support for Node 18
					[...nodeOrders].sort(sortNodes)
				: nodeOrders.toSorted(sortNodes);

		/**
		 * remove duplicated node
		 */
		const stack: { [pos: string]: number } = {};
		const removeIndexes: number[] = [];
		for (const [i, node] of sorted.entries()) {
			const id = `${node.startOffset}::${node.nodeName}`;
			if (stack[id] != null) {
				removeIndexes.push(i);
			}
			stack[id] = i;
		}
		let r = sorted.length;
		while (r-- > 0) {
			if (removeIndexes.includes(r)) {
				sorted.splice(r, 1);
			}
		}

		return sorted;
	}

	#removeOffsetSpaces(nodeList: readonly MLASTNodeTreeItem[], options?: ParseOptions): readonly MLASTNodeTreeItem[] {
		const offsetOffset = options?.offsetOffset ?? 0;
		const offsetLine = options?.offsetLine ?? 1;
		const offsetColumn = options?.offsetColumn ?? 1;

		if (offsetOffset === 0) {
			return nodeList;
		}

		const firstNode = nodeList.at(0);

		if (!firstNode || firstNode.type !== 'text') {
			return nodeList;
		}

		const raw = firstNode.raw.slice(offsetOffset);

		if (!raw) {
			if (Array.prototype.toSpliced == null) {
				const newNodeList = [...nodeList];
				// TODO: Use splice instead of toSpliced until we end support for Node 18
				newNodeList.splice(0, 1);
				return newNodeList;
			}
			return nodeList.toSpliced(0, 1);
		}

		this.updateRaw(firstNode, raw);
		this.updateLocation(firstNode, {
			startOffset: offsetOffset,
			startLine: offsetLine,
			startCol: offsetColumn,
		});

		return nodeList;
	}

	#reset() {
		// Reset state
		this.state = structuredClone(this.#defaultState);
		this.#defaultDepth = 0;
	}

	#setRawCode(rawCode: string, originalRawCode?: string) {
		this.#rawCode = rawCode;
		this.#originalRawCode = originalRawCode ?? this.#originalRawCode;
	}

	#siblingsCorrection(nodes: readonly MLASTNodeTreeItem[]) {
		const stack = new Set<string>();

		const newNodes: MLASTNodeTreeItem[] = [];
		const oldNodes =
			Array.prototype.toSorted == null
				? // TODO: Use sort instead of toSorted until we end support for Node 18
					[...nodes].sort(sortNodes)
				: nodes.toSorted(sortNodes);
		const nameToLastOpenTag: Record<string, MLASTElement> = {};

		for (const node of oldNodes) {
			const id = `${node.startOffset}::${node.nodeName}`;
			if (stack.has(id)) {
				continue;
			}
			stack.add(id);

			if (node.type === 'endtag') {
				const openTag = nameToLastOpenTag[node.nodeName];
				if (openTag && !openTag.pairNode) {
					this.#pairing(openTag, node, false);
					newNodes.push(node);
					continue;
				}
			} else if (node.type === 'starttag') {
				nameToLastOpenTag[node.nodeName] = node;
			}
			newNodes.push(node);
		}

		return newNodes;
	}

	/**
	 * Trim overlapping sections of text nodes for proper node separation
	 *
	 * @param nodeList
	 * @returns
	 */
	#trimText(nodeList: readonly MLASTNodeTreeItem[]) {
		const newNodeList: MLASTNodeTreeItem[] = [];
		let prevNode: MLASTNodeTreeItem | null = null;
		for (const node of nodeList) {
			if (
				prevNode?.type === 'text' &&
				// Empty node
				node.startOffset !== node.endOffset
			) {
				const prevNodeEndOffset = prevNode.endOffset;
				const nodeStartOffset = node.startOffset;
				if (prevNodeEndOffset > nodeStartOffset) {
					const prevNodeRaw = prevNode.raw;
					const prevNodeTrimmedRaw = prevNodeRaw.slice(0, nodeStartOffset - prevNode.startOffset);
					this.updateRaw(prevNode, prevNodeTrimmedRaw);
				}
			}
			newNodeList.push(node);
			prevNode = node;
		}
		return newNodeList;
	}
}
