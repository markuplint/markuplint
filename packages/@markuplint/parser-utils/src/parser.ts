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
	MLASTBlockBehavior,
	MLASTParseError,
	NamespaceURI,
} from '@markuplint/ml-ast';

import { randomUUID } from 'node:crypto';
import { isVoidElement as detectVoidElement } from '@markuplint/ml-spec';

import { attrTokenizer } from './attr-tokenizer.js';
import { defaultSpaces } from './const.js';
import { domLog, PerformanceTimer } from './debug.js';
import { detectElementType } from './detect-element-type.js';
import { AttrState, TagState } from './enums.js';
import { getEndCol, getEndLine, getOffsetsFromCode, getPosition } from './get-location.js';
import { ignoreBlock, restoreNode } from './ignore-block.js';
import { ignoreFrontMatter } from './ignore-front-matter.js';
import { ParserError } from './parser-error.js';
import { sortNodes } from './sort-nodes.js';
import { getNamespace } from './get-namespace.js';

const timer = new PerformanceTimer();

/**
 * Abstract base class for all markuplint parsers. Provides the core parsing pipeline
 * including tokenization, tree traversal, node flattening, and error handling.
 * Subclasses must implement `nodeize` to convert language-specific AST nodes
 * into the markuplint AST format.
 *
 * @template Node - The language-specific AST node type produced by the tokenizer
 * @template State - An optional parser state type that persists across tokenization
 */
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

	/**
	 * Buffer for parse errors collected from **embedded** parse() calls
	 * (e.g., Markdown's inline HTML blocks, Pug's raw HTML lines — these
	 * invoke a separate HtmlParser instance from inside `nodeize()`).
	 *
	 * Subclasses that delegate to an internal parser should push the
	 * resulting `parseErrors` onto this array via {@link Parser.accumulateParseErrors}.
	 * The base `parse()` merges them with the top-level tokenize result so
	 * the final `MLASTDocument.parseErrors` is complete.
	 *
	 * Reset on every `parse()` invocation.
	 */
	#embeddedParseErrors: MLASTParseError[] = [];
	/**
	 * Compiled close-tag patterns for `#rawTextElements`, populated lazily on first
	 * use and reused across every starttag in the same parse. Keyed by the original
	 * tag name (as authored in source) so a `tagNameCaseSensitive` parser that
	 * preserves casing reuses the same `RegExp` for every occurrence.
	 */
	readonly #rawTextCloseTagPatternCache = new Map<string, RegExp>();
	#authoredElementName?: ParserAuthoredElementNameDistinguishing;
	#originalRawCode = '';
	#rawCode = '';
	#defaultDepth = 0;
	#walkMethodSequentailPrevNode: MLASTNodeTreeItem | null = null;

	state: State;

	/**
	 * Creates a new Parser instance with the given options and initial state.
	 *
	 * @param options - Configuration options controlling tag handling, whitespace, and quoting behavior
	 * @param defaultState - The initial parser state, cloned and restored after each parse call
	 */
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

	/**
	 * The pattern used to distinguish authored (component) element names
	 * from native HTML elements, as specified by the parse options.
	 */
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

	/**
	 * The current raw source code being parsed, which may have been
	 * preprocessed (e.g., ignore blocks masked, front matter removed).
	 */
	get rawCode() {
		return this.#rawCode;
	}

	/**
	 * Whether tag names should be compared in a case-sensitive manner.
	 * When false (the default), tag name comparisons are case-insensitive (HTML behavior).
	 */
	get tagNameCaseSensitive() {
		return this.#tagNameCaseSensitive;
	}

	/**
	 * Tokenizes the raw source code into language-specific AST nodes.
	 * Subclasses should override this method to provide actual tokenization logic.
	 *
	 * @param options - Parse options controlling offset, depth, and other parse-time settings
	 * @returns The tokenized result containing the AST node array and fragment flag
	 */
	tokenize(options?: ParseOptions): Tokenized<Node, State> {
		return {
			ast: [],
			isFragment: false,
		};
	}

	/**
	 * Hook called before parsing begins, allowing subclasses to preprocess
	 * the raw source code. The default implementation prepends offset spaces
	 * based on the parse options.
	 *
	 * @param rawCode - The raw source code about to be parsed
	 * @param options - Parse options that may specify offset positioning
	 * @returns The preprocessed source code to be used for tokenization
	 */
	beforeParse(rawCode: string, options?: ParseOptions) {
		const spaces = this.#createOffsetSpaces(options);
		return spaces + rawCode;
	}

	/**
	 * Parses raw source code through the full pipeline: preprocessing, tokenization,
	 * traversal, flattening, ignore-block restoration, and post-processing.
	 * Returns the complete markuplint AST document.
	 *
	 * @param rawCode - The raw source code to parse
	 * @param options - Parse options controlling offsets, depth, front matter, and authored element names
	 * @returns The parsed AST document containing the node list and fragment flag
	 */
	parse(rawCode: string, options?: ParseOptions): MLASTDocument {
		try {
			// Initialize raw code
			this.#setRawCode(rawCode, rawCode);

			timer.push('beforeParse');
			const beforeParsedCode = this.beforeParse(this.rawCode, options);

			// Override raw code
			this.#setRawCode(beforeParsedCode);

			this.#authoredElementName = options?.authoredElementName;

			let frontMatter: string | null = null;
			if (options?.ignoreFrontMatter) {
				timer.push('ignoreFrontMatter');
				const fm = ignoreFrontMatter(this.rawCode);
				this.#setRawCode(fm.code);
				frontMatter = fm.frontMatter;
			}

			timer.push('ignoreBlock');
			const blocks = ignoreBlock(this.rawCode, this.#ignoreTags, this.#maskChar);
			this.#setRawCode(blocks.replaced);

			timer.push('tokenize');
			const tokenized = this.tokenize(options);
			const ast = tokenized.ast;
			const isFragment = tokenized.isFragment;
			const parseErrors = tokenized.parseErrors;

			this.#defaultDepth = options?.depth ?? this.#defaultDepth;

			timer.push('traverse');
			const traversed = this.traverse(ast, null, this.#defaultDepth);

			timer.push('afterTraverse');
			const nodeTree = this.afterTraverse([...traversed.childNodes, ...traversed.siblings]);

			timer.push('flattenNodes');
			let nodeList = this.flattenNodes(nodeTree);

			timer.push('afterFlattenNodes');
			nodeList = this.afterFlattenNodes(nodeList);

			timer.push('restoreNode');
			nodeList = restoreNode(this, nodeList, blocks, false);

			timer.push('afterParse');
			nodeList = this.afterParse(nodeList, options);

			if (frontMatter) {
				timer.push('frontMatter');
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

			timer.push('removeCircularRefs');
			// Remove circular object references (parentNodeUuid/pairNodeUuid are already set)
			for (const node of nodeList) {
				const n = node as any;
				delete n.parentNode;
				delete n.pairNode;
			}

			timer.log();
			domLog(nodeList);

			// Merge top-level tokenizer parseErrors with any parseErrors
			// pushed by embedded parser delegations (Markdown / Pug HTML
			// regions). Snapshot before #reset() clears the buffer.
			const embeddedErrors = this.embeddedParseErrors;
			const mergedParseErrors: readonly MLASTParseError[] | undefined =
				parseErrors || embeddedErrors.length > 0 ? [...(parseErrors ?? []), ...embeddedErrors] : undefined;

			this.#reset();

			return {
				raw: rawCode,
				nodeList,
				isFragment,
				...(mergedParseErrors && mergedParseErrors.length > 0 ? { parseErrors: mergedParseErrors } : {}),
			};
		} catch (error) {
			throw this.parseError(error);
		}
	}

	/**
	 * Hook called after the main parse pipeline completes, allowing subclasses
	 * to perform final transformations on the node list. The default implementation
	 * removes any offset spaces that were prepended during preprocessing.
	 *
	 * @param nodeList - The fully parsed and flattened node list
	 * @param options - The parse options used for this parse invocation
	 * @returns The post-processed node list
	 */
	afterParse(nodeList: readonly MLASTNodeTreeItem[], options?: ParseOptions): readonly MLASTNodeTreeItem[] {
		return this.#removeOffsetSpaces(nodeList, options);
	}

	/**
	 * Wraps an arbitrary error into a ParserError with source location information.
	 * Extracts line and column numbers from common error formats.
	 *
	 * @param error - The original error to wrap
	 * @returns A ParserError containing the original error's message and location data
	 */
	parseError(error: any): ParserError {
		return new ParserError(error, {
			line: error.line ?? error.lineNumber ?? 0,
			col: error.col ?? error.column ?? 0,
			raw: error.raw ?? this.rawCode,
			stack: error.stack,
		});
	}

	/**
	 * Recursively traverses language-specific AST nodes by calling `nodeize` on each,
	 * filtering duplicates, and separating child nodes from ancestor-level siblings.
	 *
	 * @param originNodes - The language-specific AST nodes to traverse
	 * @param parentNode - The parent markuplint AST node, or null for top-level nodes
	 * @param depth - The current nesting depth in the tree
	 * @returns An object containing `childNodes` at the current depth and `siblings` that belong to ancestor levels
	 */
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

		const existence = new Set<string>();

		for (const originNode of originNodes) {
			timer.push('nodeize');
			const nodes = this.nodeize(originNode, parentNode, depth);

			const filteredNodes: MLASTNodeTreeItem[] = [];
			for (const node of nodes) {
				// Remove duplicated nodes
				const id = `${node.offset}:${node.offset + node.raw.length}:${node.nodeName}:${node.type}:${node.raw}`;
				if (existence.has(id)) {
					continue;
				}
				existence.add(id);
				filteredNodes.push(node);
			}

			timer.push('afterNodeize');
			const after = this.afterNodeize(filteredNodes, parentNode, depth);

			childNodes.push(...after.siblings);
			siblings.push(...after.ancestors);
		}

		return {
			childNodes,
			siblings,
		};
	}

	/**
	 * Hook called after traversal completes, used to sort the resulting node tree
	 * by source position. Subclasses may override for custom post-traversal logic.
	 *
	 * @param nodeTree - The unsorted node tree produced by traversal
	 * @returns The node tree sorted by source position
	 */
	afterTraverse(nodeTree: readonly MLASTNodeTreeItem[]): readonly MLASTNodeTreeItem[] {
		return nodeTree.toSorted(sortNodes);
	}

	/**
	 * Converts a single language-specific AST node into one or more markuplint AST nodes.
	 * Subclasses must override this method to provide actual node conversion logic
	 * using visitor methods like `visitElement`, `visitText`, `visitComment`, etc.
	 *
	 * @param originNode - The language-specific AST node to convert
	 * @param parentNode - The parent markuplint AST node, or null for top-level nodes
	 * @param depth - The current nesting depth in the tree
	 * @returns An array of markuplint AST nodes produced from the origin node
	 */
	nodeize(originNode: Node, parentNode: MLASTParentNode | null, depth: number): readonly MLASTNodeTreeItem[] {
		return [];
	}

	/**
	 * Post-processes the nodes produced by `nodeize`, separating them into siblings
	 * at the current depth and ancestors that belong to a shallower depth level.
	 * Doctype nodes at depth 0 are promoted to ancestors.
	 *
	 * @param siblings - The nodes produced by `nodeize` for a single origin node
	 * @param parentNode - The parent markuplint AST node, or null for top-level nodes
	 * @param depth - The current nesting depth
	 * @returns An object with `siblings` at the current depth and `ancestors` at shallower depths
	 */
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

	/**
	 * Flattens a hierarchical node tree into a flat, sorted list by walking
	 * the tree depth-first and removing duplicated nodes.
	 *
	 * @param nodeTree - The hierarchical node tree to flatten
	 * @returns A flat array of all nodes in source order
	 */
	flattenNodes(nodeTree: readonly MLASTNodeTreeItem[]): readonly MLASTNodeTreeItem[] {
		return this.#arrayize(nodeTree);
	}

	/**
	 * Post-processes the flattened node list by exposing remnant whitespace and
	 * invalid nodes between known nodes, converting orphan end tags to bogus markers,
	 * concatenating adjacent text nodes, and trimming overlapping text.
	 *
	 * @param nodeList - The flat node list to post-process
	 * @param options - Controls which post-processing steps are applied
	 * @returns The cleaned-up flat node list
	 */
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

	/**
	 * Creates an AST doctype node from a token containing the doctype
	 * name, public ID, and system ID.
	 *
	 * @param token - The child token with doctype-specific properties
	 * @returns An array containing the single doctype AST node
	 */
	visitDoctype(
		token: ChildToken & {
			readonly name: string;
			readonly publicId: string;
			readonly systemId: string;
		},
	): readonly MLASTNodeTreeItem[] {
		timer.push('visitDoctype');
		const node: MLASTDoctype = {
			...token,
			...this.createToken(token),
			type: 'doctype',
			nodeName: '#doctype',
			parentNodeUuid: token.parentNode?.uuid ?? null,
		};
		return [node];
	}

	/**
	 * Creates an AST comment node from a token. Automatically detects whether
	 * the comment is a bogus comment (not starting with `<!--`).
	 *
	 * @param token - The child token containing the comment's raw text and position
	 * @param options - Optional settings to override the bogus detection
	 * @returns An array containing the single comment AST node
	 */
	visitComment(
		token: ChildToken,
		options?: {
			readonly isBogus?: boolean;
		},
	): readonly MLASTNodeTreeItem[] {
		timer.push('visitComment');
		const isBogus = options?.isBogus ?? !token.raw.startsWith('<!--');
		const node: MLASTComment = {
			...token,
			...this.createToken(token),
			type: 'comment',
			nodeName: '#comment',
			isBogus,
			parentNodeUuid: token.parentNode?.uuid ?? null,
		};
		return [node];
	}

	/**
	 * Creates AST text node(s) from a token. Optionally re-parses the text content
	 * to discover embedded HTML tags within it.
	 *
	 * @param token - The child token containing the text content and position
	 * @param options - Controls whether to search for embedded tags and how to handle invalid ones
	 * @returns An array of AST nodes; a single text node or multiple tag/text nodes if tags were found
	 */
	visitText(
		token: ChildToken,
		options?: {
			readonly researchTags?: boolean;
			readonly invalidTagAsText?: boolean;
		},
	): readonly MLASTNodeTreeItem[] {
		timer.push('visitText');
		const node: MLASTText = {
			...token,
			...this.createToken(token),
			type: 'text',
			nodeName: '#text',
			parentNodeUuid: token.parentNode?.uuid ?? null,
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

	/**
	 * Creates AST element node(s) from a token, including the start tag, optional end tag,
	 * and recursively traversed child nodes. Handles ghost elements (empty raw),
	 * self-closing tags, and nameless fragments (e.g., JSX `<>`).
	 *
	 * @param token - The child token with the element's node name; namespace is auto-detected from tag name and parent node
	 * @param childNodes - The language-specific child AST nodes to traverse
	 * @param options - Controls end tag creation, fragment handling, and property overrides
	 * @returns An array of AST nodes including the start tag, optional end tag, and any sibling nodes
	 */
	visitElement(
		token: ChildToken & {
			readonly nodeName: string;
		},
		childNodes: readonly Node[] = [],
		options?: {
			readonly createEndTagToken?: (startTag: MLASTElement) => ChildToken | null;
			readonly namelessFragment?: boolean;
			readonly overwriteProps?: Partial<MLASTElement>;
		},
	): readonly MLASTNodeTreeItem[] {
		timer.push('visitElement');
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
				blockBehavior: null,
				parentNode: token.parentNode,
				parentNodeUuid: token.parentNode?.uuid ?? null,
				pairNode: null,
				pairNodeUuid: null,
				tagCloseChar: '',
				tagOpenChar: '',
				isGhost: true,
				isFragment: false,
				namespace: getNamespace(null, token.parentNode),
				...overwriteProps,
			};

			const siblings = this.visitChildren(childNodes, startTag);

			return [startTag, ...siblings];
		}

		const startTag = {
			...this.#parseStartTag(
				token,
				{
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

	/**
	 * Creates an AST preprocessor-specific block node (e.g., for template directives
	 * like `{#if}`, `{#each}`, or front matter). Recursively traverses child nodes.
	 *
	 * @param token - The child token with the block's node name and fragment flag
	 * @param childNodes - The language-specific child AST nodes to traverse
	 * @param blockBehavior - The block behavior if this is a control-flow block (e.g., "if", "each")
	 * @param originBlockNode - The original language-specific block node for reference
	 * @returns An array of AST nodes including the block node and any sibling nodes
	 */
	visitPsBlock(
		token: ChildToken & {
			readonly nodeName: string;
			readonly isFragment: boolean;
		},
		childNodes: readonly Node[] = [],
		blockBehavior: MLASTBlockBehavior | null = null,
		originBlockNode?: Node,
	): readonly MLASTNodeTreeItem[] {
		timer.push('visitPsBlock');
		const block: MLASTPreprocessorSpecificBlock = {
			...token,
			...this.createToken(token),
			type: 'psblock',
			blockBehavior,
			nodeName: `#ps:${token.nodeName}`,
			childNodes: [],
			isBogus: false,
			parentNodeUuid: token.parentNode?.uuid ?? null,
		};

		const siblings = this.visitChildren(childNodes, block);

		return [block, ...siblings];
	}

	/**
	 * Traverses a list of child nodes under the given parent, appending the resulting
	 * child AST nodes to the parent and returning any sibling nodes that belong
	 * to ancestor levels. Skips traversal for raw text elements (e.g., `<script>`, `<style>`).
	 *
	 * @param children - The language-specific child AST nodes to traverse
	 * @param parentNode - The parent markuplint AST node to which children will be appended
	 * @returns An array of sibling nodes that belong to ancestor depth levels
	 */
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

	/**
	 * Attempts to parse a token as a JSX spread attribute (e.g., `{...props}`).
	 * Returns null if the token does not match the spread attribute pattern.
	 *
	 * @param token - The token to inspect for spread attribute syntax
	 * @returns A spread attribute AST node, or null if the token is not a spread attribute
	 */
	visitSpreadAttr(token: Token): MLASTSpreadAttr | null {
		timer.push('visitSpreadAttr');
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

		const node = this.createToken(raw, token.offset, token.line, token.col);

		return {
			...node,
			type: 'spread',
			nodeName: '#spread',
		};
	}

	/**
	 * Parses a token into a fully structured attribute AST node, breaking it down
	 * into its constituent parts: spaces, name, equal sign, quotes, and value.
	 * Also detects spread attributes. If there is leftover text after the attribute,
	 * it is returned in the `__rightText` property for further processing.
	 *
	 * @param token - The token containing the raw attribute text and position
	 * @param options - Controls quoting behavior, value types, and the initial parser state
	 * @returns The parsed attribute AST node with an optional `__rightText` for remaining unparsed content
	 */
	visitAttr(
		token: Token,
		options?: {
			readonly quoteSet?: readonly QuoteSet[];
			readonly noQuoteValueType?: ValueType;
			readonly endOfUnquotedValueChars?: readonly string[];
			readonly startState?: AttrState;
		},
	): MLASTAttr & { __rightText?: string } {
		timer.push('visitAttr');
		const raw = token.raw;

		const quoteSet = options?.quoteSet;
		const startState = options?.startState ?? AttrState.BeforeName;
		const noQuoteValueType = options?.noQuoteValueType;
		const endOfUnquotedValueChars = options?.endOfUnquotedValueChars;

		let curOffset = token.offset;
		let curLine = token.line;
		let curCol = token.col;

		let tokens: ReturnType<typeof attrTokenizer>;
		try {
			tokens = attrTokenizer(raw, quoteSet, startState, noQuoteValueType, endOfUnquotedValueChars);
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new ParserError(error.message, token);
			}
			throw error;
		}

		const spacesBeforeName = this.createToken(tokens.spacesBeforeAttrName, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(spacesBeforeName));

		const name = this.createToken(tokens.attrName, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(name));

		const spacesBeforeEqual = this.createToken(tokens.spacesBeforeEqual, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(spacesBeforeEqual));

		const equal = this.createToken(tokens.equal, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(equal));

		const spacesAfterEqual = this.createToken(tokens.spacesAfterEqual, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(spacesAfterEqual));

		const startQuote = this.createToken(tokens.quoteStart, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(startQuote));

		const value = this.createToken(tokens.attrValue, curOffset, curLine, curCol);
		({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(value));

		const endQuote = this.createToken(tokens.quoteEnd, curOffset, curLine, curCol);

		const attrToken = this.createToken(
			tokens.attrName +
				tokens.spacesBeforeEqual +
				tokens.equal +
				tokens.spacesAfterEqual +
				tokens.quoteStart +
				tokens.attrValue +
				tokens.quoteEnd,
			name.offset,
			name.line,
			name.col,
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

	/**
	 * Re-parses a text token to discover embedded HTML/XML tags within it,
	 * splitting the content into a sequence of tag and text AST nodes.
	 * Handles self-closing detection, depth tracking, void element recognition,
	 * and the raw-text element body short-circuit (HTML LS §13.2.5.1).
	 *
	 * Raw-text element handling only covers the elements listed in
	 * `rawTextElements` (default `['style', 'script']`). HTML LS *escapable* raw
	 * text elements — `<title>` and `<textarea>` — are intentionally NOT in the
	 * default. They allow character references (`&amp;` etc.) in their body, and
	 * decoding is not implemented in this short-circuit. A subclass that adds
	 * them via the `rawTextElements` option will see character references passed
	 * through verbatim.
	 *
	 * @param token - The child token containing the code fragment to re-parse
	 * @param options - Controls whether nameless fragments (JSX `<>`) are recognized
	 * @returns An array of tag and text AST nodes discovered in the code fragment
	 * @see https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions
	 * @see https://github.com/markuplint/markuplint/issues/3825
	 */
	parseCodeFragment(
		token: ChildToken,
		options?: {
			readonly namelessFragment?: boolean;
		},
	) {
		const nodes: (MLASTTag | MLASTText)[] = [];

		let raw = token.raw;
		let curOffset = token.offset;
		let curLine = token.line;
		let curCol = token.col;
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
					offset: curOffset,
					line: curLine,
					col: curCol,
					depth,
					parentNode: token.parentNode,
				},
				true,
				true,
				options?.namelessFragment ?? false,
			);

			if (parsed.__left) {
				const token = this.createToken(parsed.__left, curOffset, curLine, curCol);
				const textNode: MLASTText = {
					...token,
					type: 'text',
					depth,
					nodeName: '#text',
					parentNode: null,
					parentNodeUuid: null,
				};
				nodes.push(textNode);
			}

			raw = parsed.__right ?? '';

			if (!parsed.token) {
				continue;
			}

			const tag = parsed.token;

			({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(tag));

			let isSelfClose = tag.type === 'starttag' && tag.tagCloseChar.startsWith('/');
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

			/**
			 * Raw-text element body short-circuit (HTML Living Standard §13.2.5.1
			 * — "Restrictions on the contents of raw text and escapable raw text
			 * elements". The spec section anchor is `cdata-rcdata-restrictions`,
			 * where RCDATA stands for "Raw text + Character REF data" — the broader
			 * class that covers escapable raw text such as `<title>` / `<textarea>`).
			 *
			 * Per spec, the contents of `<script>` / `<style>` (and any caller-supplied
			 * raw-text element) are NOT re-tokenized as HTML — the only thing that
			 * terminates the body is `</tagName` followed by a tab/LF/FF/CR/space/`>`
			 * /`/`. Without this guard, fragments like `<script>const t = s.replace(
			 * /<br\s*\/?>/gi, " ");</script>` would feed the regex to `#parseTag`,
			 * which would try to parse `<br\s*\/?>` as a tag and throw on the
			 * backslash (#3825).
			 *
			 * This is dormant for `jsx-parser` and `mdx-parser` because their upstream
			 * tokenizers reject bare `<` in element body before reaching here, but the
			 * fix keeps `parseCodeFragment` honest for any future caller.
			 *
			 * @see https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions
			 * @see https://github.com/markuplint/markuplint/issues/3825
			 */
			if (tag.type === 'starttag' && !isSelfClose && this.#rawTextElements.includes(tag.nodeName.toLowerCase())) {
				const closeTagPattern = this.#getRawTextCloseTagPattern(tag.nodeName);
				const match = closeTagPattern.exec(raw);
				if (match) {
					const bodyRaw = raw.slice(0, match.index);
					if (bodyRaw) {
						const bodyToken = this.createToken(bodyRaw, curOffset, curLine, curCol);
						const bodyNode: MLASTText = {
							...bodyToken,
							type: 'text',
							depth,
							nodeName: '#text',
							parentNode: null,
							parentNodeUuid: null,
						};
						nodes.push(bodyNode);
						({ offset: curOffset, line: curLine, col: curCol } = this.#getEndLocation(bodyToken));
					}
					raw = raw.slice(match.index);
				}
				// If no matching close tag is found, fall through to the generic loop
				// so the existing "unclosed tag" handling remains in effect.
			}
		}
		return nodes;
	}

	/**
	 * Updates the position and depth properties of an AST node.
	 *
	 * @param node - The AST node whose location should be updated
	 * @param props - The new position and depth values to apply (only provided values are changed)
	 */
	updateLocation(
		node: MLASTNodeTreeItem,
		props: Partial<Pick<MLASTNodeTreeItem, 'offset' | 'line' | 'col' | 'depth'>>,
	) {
		Object.assign(node, {
			offset: props.offset ?? node.offset,
			line: props.line ?? node.line,
			col: props.col ?? node.col,
			depth: props.depth ?? node.depth,
		});
	}

	/**
	 * Set new raw code to target node.
	 *
	 * @param node target node
	 * @param raw new raw code
	 */
	updateRaw(node: MLASTToken, raw: string) {
		Object.assign(node, {
			raw,
		});
	}

	/**
	 * Updates the node name and/or element type of an element or close tag AST node.
	 * Useful for renaming elements or changing their classification after initial parsing.
	 *
	 * @param el - The element or close tag AST node to update
	 * @param props - The properties to overwrite on the element
	 */
	updateElement(el: MLASTElement, props: Partial<Pick<MLASTElement, 'nodeName' | 'elementType'>>): void;
	updateElement(el: MLASTElementCloseTag, props: Partial<Pick<MLASTElementCloseTag, 'nodeName'>>): void;
	updateElement(el: MLASTTag, props: Partial<Pick<MLASTElement, 'nodeName' | 'elementType'>>): void {
		Object.assign(el, props);
	}

	/**
	 * Updates metadata properties on an HTML attribute AST node, such as marking
	 * it as a directive, dynamic value, or setting its potential name/value
	 * for preprocessor-specific attribute transformations.
	 *
	 * @param attr - The HTML attribute AST node to update
	 * @param props - The metadata properties to overwrite on the attribute
	 */
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

	/**
	 * Determines the element type (e.g., "html", "web-component", "authored") for a
	 * given tag name, using the parser's authored element name distinguishing pattern.
	 *
	 * @param nodeName - The tag name to classify
	 * @param defaultPattern - A fallback pattern if no authored element name pattern is set
	 * @returns The element type classification
	 */
	detectElementType(nodeName: string, defaultPattern?: ParserAuthoredElementNameDistinguishing): ElementType {
		return detectElementType(nodeName, this.#authoredElementName, defaultPattern);
	}

	/**
	 * Creates a new MLASTToken with a generated UUID.
	 * Accepts either a Token object or a raw string with explicit start coordinates.
	 *
	 * @param token - A Token object or raw string to create the AST token from
	 * @param offset - The zero-based byte offset where the token starts (required when token is a string)
	 * @param line - The one-based line number where the token starts (required when token is a string)
	 * @param col - The one-based column number where the token starts (required when token is a string)
	 * @returns An AST token with UUID, start position, and raw content
	 */
	createToken(token: Token): MLASTToken;
	createToken(token: string, offset: number, line: number, col: number): MLASTToken;
	createToken(token: string | Token, offset?: number, line?: number, col?: number): MLASTToken {
		const props =
			typeof token === 'string'
				? {
						raw: token,
						offset: offset ?? 0,
						line: line ?? 1,
						col: col ?? 1,
					}
				: token;

		return {
			uuid: randomUUID().slice(0, 8),
			...props,
		};
	}

	/**
	 * Extracts a Token from the current raw code at the given byte offset range,
	 * computing the line and column from the source position.
	 *
	 * @param start - The starting byte offset (inclusive) in the raw code
	 * @param end - The ending byte offset (exclusive) in the raw code; if omitted, slices to the end
	 * @returns A Token containing the sliced raw content and its start position
	 */
	sliceFragment(start: number, end?: number): Token {
		const raw = this.rawCode.slice(start, end);
		const { line: l, column } = getPosition(this.rawCode, start);
		return {
			raw,
			offset: start,
			line: l,
			col: column,
		};
	}

	/**
	 * Calculates start and end byte offsets from line/column positions
	 * within the current raw source code.
	 *
	 * @param startLine - The starting line number (1-based)
	 * @param startCol - The starting column number (1-based)
	 * @param endLine - The ending line number (1-based)
	 * @param endCol - The ending column number (1-based)
	 * @returns The computed start and end byte offsets
	 */
	getOffsetsFromCode(startLine: number, startCol: number, endLine: number, endCol: number) {
		return getOffsetsFromCode(this.rawCode, startLine, startCol, endLine, endCol);
	}

	/**
	 * Walks through a node list depth-first, invoking the walker callback for each node.
	 * The walker receives the current node, the sequentially previous node, and the depth.
	 * Automatically recurses into child nodes of parent elements and preprocessor blocks.
	 *
	 * @template Node - The specific AST node type being walked
	 * @param nodeList - The list of nodes to walk
	 * @param walker - The callback invoked for each node during the walk
	 * @param depth - The current depth (starts at 0 for top-level calls)
	 */
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

	/**
	 * Appends child nodes to a parent node, updating parent references and
	 * maintaining sorted order by source position. If a child already exists
	 * in the parent (by UUID), it is replaced in place rather than duplicated.
	 *
	 * @param parentNode - The parent node to append children to, or null (no-op)
	 * @param childNodes - The child nodes to append
	 */
	appendChild(parentNode: MLASTParentNode | null, ...childNodes: readonly MLASTChildNode[]) {
		if (!parentNode || childNodes.length === 0) {
			return;
		}

		const newChildNodes = [...parentNode.childNodes];

		for (const appendingChild of childNodes) {
			const currentIndex = parentNode.childNodes.findIndex(n => n.uuid === appendingChild.uuid);

			Object.assign(appendingChild, { parentNode, parentNodeUuid: parentNode.uuid });

			if (currentIndex === -1) {
				newChildNodes.push(appendingChild);
				continue;
			}

			newChildNodes.splice(currentIndex, 1, appendingChild);
		}

		Object.assign(parentNode, {
			childNodes: newChildNodes.toSorted(sortNodes),
		});
	}

	/**
	 * Replaces a child node within a parent's child list with one or more replacement nodes.
	 * If the old child is not found in the parent, the operation is a no-op.
	 *
	 * @param parentNode - The parent node containing the child to replace
	 * @param oldChildNode - The existing child node to be replaced
	 * @param replacementChildNodes - The replacement nodes to insert at the old child's position
	 */
	replaceChild(
		parentNode: MLASTParentNode,
		oldChildNode: MLASTChildNode,
		...replacementChildNodes: readonly MLASTChildNode[]
	) {
		const index = parentNode.childNodes.findIndex(childNode => childNode.uuid === oldChildNode.uuid);
		if (index === -1) {
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
				prevNode.offset + prevNode.raw.length === node.offset
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
			uuid: randomUUID().slice(0, 8),
			raw: nodes.map(n => n.raw).join(''),
		};

		for (const node of nodes) {
			this.#removeChild(node.parentNode ?? null, node);
		}

		this.appendChild(textNode.parentNode ?? null, textNode);

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
				const prevEndOffset = sequentailPrevNode
					? sequentailPrevNode.offset + sequentailPrevNode.raw.length
					: 0;
				const remnantNodes = this.#createRemnantNode(
					prevEndOffset,
					node.offset,
					node.depth,
					node.parentNode ?? null,
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
			lastNode.offset + lastNode.raw.length,
			undefined,
			lastNode.depth,
			lastNode.parentNode ?? null,
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
		return {
			offset: token.offset + token.raw.length,
			line: getEndLine(token.raw, token.line),
			col: getEndCol(token.raw, token.col),
		} as const;
	}

	/**
	 * Returns a cached close-tag pattern for a raw-text element, building it on first
	 * use. The pattern matches `</tagName` followed by a tab/LF/FF/CR/space/`>`/`/`
	 * (HTML LS §13.2.5.1) ASCII-case-insensitively. Caching avoids recompiling the
	 * `RegExp` for every `<script>` / `<style>` start tag in large documents.
	 */
	#getRawTextCloseTagPattern(tagName: string): RegExp {
		const cached = this.#rawTextCloseTagPatternCache.get(tagName);
		if (cached) {
			return cached;
		}
		const escapedName = tagName.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&');
		// `regexp/strict` cannot statically verify a pattern built from the
		// dynamic `escapedName` interpolation; the escape above is the contract
		// that makes this safe for any caller-supplied `rawTextElements` value.
		// eslint-disable-next-line regexp/strict
		const pattern = new RegExp(`</${escapedName}(?=[\\t\\n\\f\\r >/])`, 'i');
		this.#rawTextCloseTagPatternCache.set(tagName, pattern);
		return pattern;
	}

	/**
	 * Checks whether a node is a descendant of another node by walking up
	 * the parent chain.
	 *
	 * @param node - The node to test.
	 * @param potentialAncestor - The node that may be an ancestor.
	 * @returns `true` if `node` is a descendant of `potentialAncestor`.
	 */
	#isDescendantOf(node: MLASTNodeTreeItem, potentialAncestor: MLASTNodeTreeItem): boolean {
		let current: MLASTParentNode | null = 'parentNode' in node ? (node.parentNode ?? null) : null;
		while (current) {
			if (current === potentialAncestor) {
				return true;
			}
			current = current.parentNode ?? null;
		}
		return false;
	}

	#orphanEndTagToBogusMark(nodeList: readonly MLASTNodeTreeItem[]) {
		const newNodeList: MLASTNodeTreeItem[] = [];
		for (let node of nodeList) {
			if (node.type === 'endtag') {
				const endTagUUID = node.uuid;
				const openTag = newNodeList.findLast<MLASTElement>((n): n is MLASTElement =>
					n.type === 'starttag' && !n.isGhost ? n.pairNodeUuid === endTagUUID : false,
				);
				if (!openTag) {
					node = this.#convertIntoInvalidNode(node);
				}
			}
			newNodeList.push(node);
		}
		return newNodeList;
	}

	#pairing(startTag: MLASTElement, endTag: MLASTElementCloseTag) {
		Object.assign(startTag, { pairNode: endTag, pairNodeUuid: endTag.uuid });
		Object.assign(endTag, { pairNode: startTag, pairNodeUuid: startTag.uuid });
		this.appendChild(startTag.parentNode ?? null, endTag);
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
		const initialOffset = token.offset;
		const initialLine = token.line;
		const initialCol = token.col;

		let offset = initialOffset;
		let line = initialLine;
		let col = initialCol;

		let tagStartOffset = offset;
		let tagStartLine = line;
		let tagStartCol = col;

		let state: TagState = TagState.BeforeOpenTag;
		let beforeOpenTagChars = '';
		let tagName = '';
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
						({ offset, line, col } = this.#getEndLocation(beforeOpenTag));

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
							offset,
							line,
							col,
						});

						({ offset, line, col } = this.#getEndLocation(attr));

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
			parentNodeUuid: null,
		};

		const tag: MLASTTag = isOpenTag
			? {
					...tagToken,
					...commons,
					type: 'starttag',
					elementType: this.detectElementType(tagName),
					namespace:
						'namespace' in token
							? (token.namespace as NamespaceURI)
							: getNamespace(tagName, token.parentNode),
					attributes: attrs,
					childNodes: [],
					pairNode: null,
					pairNodeUuid: null,
					tagOpenChar: '<',
					tagCloseChar: selfClosingSolidusChar + '>',
					blockBehavior: null,
					isGhost: false,
					isFragment,
				}
			: {
					...tagToken,
					...commons,
					type: 'endtag',
					pairNode: {} as MLASTElement,
					pairNodeUuid: null,
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
		const sorted = nodeOrders.toSorted(sortNodes);

		/**
		 * remove duplicated node
		 */
		const stack: { [pos: string]: number } = {};
		const removeIndexes: number[] = [];
		for (const [i, node] of sorted.entries()) {
			const id = `${node.offset}::${node.nodeName}`;
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
			return nodeList.toSpliced(0, 1);
		}

		this.updateRaw(firstNode, raw);
		this.updateLocation(firstNode, {
			offset: offsetOffset,
			line: offsetLine,
			col: offsetColumn,
		});

		return nodeList;
	}

	#reset() {
		// Reset state
		this.state = structuredClone(this.#defaultState);
		this.#defaultDepth = 0;
		this.#embeddedParseErrors = [];
	}

	/**
	 * Subclass hook for parsers that delegate to an embedded parse() call —
	 * e.g., `@markuplint/markdown-parser` parsing inline HTML blocks via a
	 * private `HtmlParser` instance, or `@markuplint/pug-parser` re-running
	 * each raw HTML line through `HtmlInPugParser`. Push the embedded
	 * document's `parseErrors` here so the top-level `parse()` can merge
	 * them into the outer `MLASTDocument.parseErrors`.
	 *
	 * If the embedded document has no `parseErrors`, this is a no-op.
	 *
	 * @param parseErrors - Parse errors collected by the embedded parser. May be `undefined`.
	 */
	protected accumulateParseErrors(parseErrors: readonly MLASTParseError[] | undefined): void {
		if (parseErrors && parseErrors.length > 0) {
			this.#embeddedParseErrors.push(...parseErrors);
		}
	}

	/**
	 * @internal Read-only snapshot of accumulated embedded parse errors.
	 * Used by {@link Parser.parse} to merge them with the top-level tokenize
	 * result. Subclasses should not call this directly — push via
	 * {@link Parser.accumulateParseErrors} instead.
	 */
	get embeddedParseErrors(): readonly MLASTParseError[] {
		return this.#embeddedParseErrors;
	}

	#setRawCode(rawCode: string, originalRawCode?: string) {
		this.#rawCode = rawCode;
		this.#originalRawCode = originalRawCode ?? this.#originalRawCode;
	}

	/**
	 * Trims text nodes whose source range overlaps with the next node in
	 * the flat list. This prevents text content from bleeding into adjacent
	 * elements that occupy a later (or overlapping) source range.
	 *
	 * Skips trimming when the text node is a descendant of the next node
	 * in the tree hierarchy, because synthetic parsers (e.g., Markdown)
	 * can produce child elements that share the same source range as their
	 * parent and therefore appear before the parent in offset-sorted order.
	 *
	 * @param nodeList - The flat, offset-sorted node list to process.
	 * @returns A new node list with overlapping text nodes trimmed.
	 */
	#trimText(nodeList: readonly MLASTNodeTreeItem[]) {
		const newNodeList: MLASTNodeTreeItem[] = [];
		let prevNode: MLASTNodeTreeItem | null = null;
		for (const node of nodeList) {
			if (
				prevNode?.type === 'text' &&
				// Empty node
				node.raw.length > 0
			) {
				const prevNodeEndOffset = prevNode.offset + prevNode.raw.length;
				const nodeStartOffset = node.offset;
				if (prevNodeEndOffset > nodeStartOffset && !this.#isDescendantOf(prevNode, node)) {
					const prevNodeRaw = prevNode.raw;
					const prevNodeTrimmedRaw = prevNodeRaw.slice(0, nodeStartOffset - prevNode.offset);
					this.updateRaw(prevNode, prevNodeTrimmedRaw);
				}
			}
			newNodeList.push(node);
			prevNode = node;
		}
		return newNodeList;
	}
}
