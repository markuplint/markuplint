/**
 * Discriminant union tag representing the kind of AST node.
 *
 * - `'doctype'`   – A DOCTYPE declaration node
 * - `'starttag'`  – An opening element tag
 * - `'endtag'`    – A closing element tag
 * - `'comment'`   – An HTML comment
 * - `'text'`      – A text node
 * - `'omittedtag'`– An omitted tag (e.g. implicit `<tbody>`)
 * - `'psblock'`   – A preprocessor-specific block (template engine constructs)
 * - `'invalid'`   – A node that could not be parsed correctly
 * - `'attr'`      – A regular HTML attribute
 * - `'spread'`    – A spread attribute (e.g. `{...props}` in JSX)
 */
export type MLASTNodeType =
	| 'doctype'
	| 'starttag'
	| 'endtag'
	| 'comment'
	| 'text'
	| 'omittedtag'
	| 'psblock'
	| 'invalid'
	| 'attr'
	| 'spread';

/**
 * Element type
 *
 * - `html`: From native HTML Standard
 * - `web-component`: As the Web Component according to HTML Standard
 * - `authored`:  Authored element (JSX Element etc.) through the view framework or the template engine.
 */
export type ElementType = 'html' | 'web-component' | 'authored';

/**
 * Union of every possible AST node type produced by a markuplint parser.
 */
export type MLASTNode =
	| MLASTDoctype
	| MLASTTag
	| MLASTComment
	| MLASTText
	| MLASTPreprocessorSpecificBlock
	| MLASTInvalid
	| MLASTAttr;

/**
 * Nodes that can act as a parent in the AST tree (i.e. contain child nodes).
 */
export type MLASTParentNode = MLASTElement | MLASTPreprocessorSpecificBlock;

/**
 * Top-level items in the AST node tree: either child nodes or a DOCTYPE declaration.
 */
export type MLASTNodeTreeItem = MLASTChildNode | MLASTDoctype;

/**
 * Nodes that can appear as children within an element or preprocessor block.
 */
export type MLASTChildNode = MLASTTag | MLASTText | MLASTComment | MLASTPreprocessorSpecificBlock | MLASTInvalid;

/**
 * A tag node: either an opening element or a closing element tag.
 */
export type MLASTTag = MLASTElement | MLASTElementCloseTag;

/**
 * An attribute node: either a regular HTML attribute or a spread attribute.
 */
export type MLASTAttr = MLASTHTMLAttr | MLASTSpreadAttr;

/**
 * Base token representing a span of source text with positional information.
 * Every AST node ultimately extends this interface.
 */
export interface MLASTToken {
	/** Unique identifier for this token instance */
	readonly uuid: string;
	/** The original raw source text of this token */
	readonly raw: string;
	/** Zero-based character offset of the token start in the source */
	readonly startOffset: number;
	/** Zero-based character offset of the token end in the source */
	readonly endOffset: number;
	/** One-based line number where the token starts */
	readonly startLine: number;
	/** One-based line number where the token ends */
	readonly endLine: number;
	/** One-based column number where the token starts */
	readonly startCol: number;
	/** One-based column number where the token ends */
	readonly endCol: number;
}

/**
 * Abstract base for all AST nodes. Extends {@link MLASTToken} with
 * a discriminant `type`, a `nodeName`, and a reference to the parent node.
 */
interface MLASTAbstractNode extends MLASTToken {
	/** Discriminant tag identifying the concrete node kind */
	readonly type: MLASTNodeType;
	/** The node name (tag name, `#text`, `#comment`, etc.) */
	readonly nodeName: string;
	/** Reference to the parent node, or `null` for top-level nodes */
	readonly parentNode: MLASTParentNode | null;
}

/**
 * A DOCTYPE declaration node (e.g. `<!DOCTYPE html>`).
 */
export interface MLASTDoctype extends MLASTAbstractNode {
	readonly type: 'doctype';
	/** Nesting depth in the document tree (always 0 for DOCTYPE) */
	readonly depth: number;
	/** The declared document type name (e.g. `"html"`) */
	readonly name: string;
	/** The public identifier of the DOCTYPE, if any */
	readonly publicId: string;
	/** The system identifier of the DOCTYPE, if any */
	readonly systemId: string;
}

/**
 * An opening element tag (e.g. `<div class="foo">`).
 * This is the primary element representation in the AST and owns
 * child nodes, attributes, and a reference to its closing tag.
 */
export interface MLASTElement extends MLASTAbstractNode {
	readonly type: 'starttag';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** Namespace URI of the element (e.g. `"http://www.w3.org/1999/xhtml"`) */
	readonly namespace: string;
	/** Whether the element is native HTML, a Web Component, or an authored component */
	readonly elementType: ElementType;
	/** Whether this element acts as a fragment (no actual DOM node) */
	readonly isFragment: boolean;
	/** Attributes on this element */
	readonly attributes: readonly MLASTAttr[];
	/** Whether the element has one or more spread attributes */
	readonly hasSpreadAttr?: boolean;
	/** Direct child nodes of this element */
	readonly childNodes: readonly MLASTChildNode[];
	/** The matching closing tag, or `null` for void / self-closing elements */
	readonly pairNode: MLASTElementCloseTag | null;
	/** The self-closing solidus token (`/`), if present (e.g. `<br />`) */
	readonly selfClosingSolidus?: MLASTToken;
	/** The characters that open this tag (usually `"<"`) */
	readonly tagOpenChar: string;
	/** The characters that close this tag (usually `">"`) */
	readonly tagCloseChar: string;
	/** Whether this element is a ghost node (omitted tag inferred by the parser) */
	readonly isGhost: boolean;
}

/**
 * A closing element tag (e.g. `</div>`).
 * Always paired with an {@link MLASTElement} via `pairNode`.
 */
export interface MLASTElementCloseTag extends MLASTAbstractNode {
	readonly type: 'endtag';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** Closing tags do not have a parent node in the AST */
	readonly parentNode: null;
	/** The matching opening element tag */
	readonly pairNode: MLASTElement;
	/** The characters that open this tag (usually `"</"`) */
	readonly tagOpenChar: string;
	/** The characters that close this tag (usually `">"`) */
	readonly tagCloseChar: string;
}

/**
 * A preprocessor-specific block node, representing control-flow constructs
 * from template engines and frameworks (e.g. `{#if}`, `{#each}` in Svelte,
 * `v-if` blocks in Vue, `<% if %>` in EJS/ERB).
 */
export interface MLASTPreprocessorSpecificBlock extends MLASTAbstractNode {
	readonly type: 'psblock';
	/** The kind of conditional or iteration construct this block represents */
	readonly conditionalType: MLASTPreprocessorSpecificBlockConditionalType;
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** The block's name as determined by the parser */
	readonly nodeName: string;
	/** Whether this block acts as a transparent fragment */
	readonly isFragment: boolean;
	/** Direct child nodes within this block */
	readonly childNodes: readonly MLASTChildNode[];
	/** Whether this block is bogus (unparsable or malformed) */
	readonly isBogus: boolean;
}

/**
 * The type of conditional or iteration construct represented by a
 * {@link MLASTPreprocessorSpecificBlock}. `null` indicates a block
 * without a specific conditional semantic.
 */
export type MLASTPreprocessorSpecificBlockConditionalType =
	| 'if'
	| 'if:elseif'
	| 'if:else'
	| 'switch:case'
	| 'switch:default'
	| 'each'
	| 'each:empty'
	| 'await'
	| 'await:then'
	| 'await:catch'
	| 'end'
	| null;

/**
 * An HTML comment node (e.g. `<!-- ... -->`).
 */
export interface MLASTComment extends MLASTAbstractNode {
	readonly type: 'comment';
	readonly nodeName: '#comment';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** Whether the comment is bogus (e.g. a malformed comment) */
	readonly isBogus: boolean;
}

/**
 * A text node containing character data between elements.
 */
export interface MLASTText extends MLASTAbstractNode {
	readonly type: 'text';
	readonly nodeName: '#text';
	/** Nesting depth in the document tree */
	readonly depth: number;
}

/**
 * A node representing markup that could not be parsed correctly.
 * Always marked as bogus.
 */
export interface MLASTInvalid extends MLASTAbstractNode {
	readonly type: 'invalid';
	readonly nodeName: '#invalid';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** The kind of node this was intended to be before parsing failed */
	readonly kind?: Exclude<MLASTChildNode['type'], 'invalid'>;
	/** Invalid nodes are always bogus */
	readonly isBogus: true;
}

/**
 * A regular HTML attribute node, decomposed into its constituent tokens
 * (name, equal sign, quotes, value, and surrounding whitespace).
 */
export interface MLASTHTMLAttr extends MLASTToken {
	readonly type: 'attr';
	/** The attribute name as a string */
	readonly nodeName: string;
	/** Whitespace token before the attribute name */
	readonly spacesBeforeName: MLASTToken;
	/** The attribute name token */
	readonly name: MLASTToken;
	/** Whitespace token between the name and the equal sign */
	readonly spacesBeforeEqual: MLASTToken;
	/** The equal sign token */
	readonly equal: MLASTToken;
	/** Whitespace token between the equal sign and the value */
	readonly spacesAfterEqual: MLASTToken;
	/** The opening quote token */
	readonly startQuote: MLASTToken;
	/** The attribute value token */
	readonly value: MLASTToken;
	/** The closing quote token */
	readonly endQuote: MLASTToken;
	/** Whether the value is a dynamic expression (e.g. a binding in a framework) */
	readonly isDynamicValue?: true;
	/** Whether the attribute is a framework directive (e.g. `v-if`, `@click`) */
	readonly isDirective?: true;
	/** The resolved attribute name when the actual name is a framework-specific directive */
	readonly potentialName?: string;
	/** The resolved attribute value when the actual value is dynamic */
	readonly potentialValue?: string;
	/** The semantic type of the attribute value */
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';
	/** A candidate attribute name for auto-correction */
	readonly candidate?: string;
	/** Whether this attribute is allowed to appear multiple times on the same element */
	readonly isDuplicatable: boolean;
}

/**
 * A spread attribute node (e.g. `{...props}` in JSX).
 */
export interface MLASTSpreadAttr extends MLASTToken {
	readonly type: 'spread';
	readonly nodeName: '#spread';
}

/**
 * The root document node returned by a parser.
 * Contains the full node list and metadata about the parse result.
 */
export interface MLASTDocument {
	/** The full original source code */
	readonly raw: string;
	/** Flat list of top-level AST nodes in document order */
	readonly nodeList: readonly MLASTNodeTreeItem[];
	/** Whether the document is a fragment (no root element required) */
	readonly isFragment: boolean;
	/** A description of any unknown parse error that occurred, if any */
	readonly unknownParseError?: string;
}

/**
 * @deprecated Use `MLParser` instead. This will be dropped in v5.
 */
export interface MLMarkupLanguageParser {
	/**
	 * @deprecated
	 */
	parse(
		sourceCode: string,
		options?: ParserOptions & {
			readonly offsetOffset?: number;
			readonly offsetLine?: number;
			readonly offsetColumn?: number;
		},
	): MLASTDocument;

	/**
	 * @default "omittable"
	 * @deprecated
	 */
	endTag?: EndTagType;

	/**
	 * Detect value as a true if its attribute is booleanish value and omitted.
	 *
	 * Ex:
	 * ```jsx
	 * <Component aria-hidden />
	 * ```
	 *
	 * In the above, the `aria-hidden` is `true`.
	 *
	 * @deprecated
	 */
	booleanish?: boolean;
}

/**
 * Interface for a markuplint-compatible parser.
 * Implementations parse markup source code and produce an {@link MLASTDocument}.
 */
export interface MLParser {
	parse(
		sourceCode: string,
		options?: ParserOptions & {
			readonly offsetOffset?: number;
			readonly offsetLine?: number;
			readonly offsetColumn?: number;
		},
	): MLASTDocument;

	/**
	 * @default "omittable"
	 */
	endTag?: EndTagType;

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
	booleanish?: boolean;

	/** Whether tag names should be treated as case-sensitive (e.g. for XHTML or JSX) */
	tagNameCaseSensitive?: boolean;
}

/**
 * A module that exports a parser. Used for dynamic parser resolution.
 */
export interface MLParserModule {
	/** The parser instance */
	readonly parser: MLParser;
}

/**
 * The end tag omittable type.
 *
 * - `"xml"`: Must need an end tag or must self-close
 * - `"omittable"`: May omit
 * - `"never"`: Never need
 */
export type EndTagType = 'xml' | 'omittable' | 'never';

/**
 * Options that can be passed to a parser to customize its behavior.
 */
export type ParserOptions = {
	/** Whether to ignore front matter (e.g. YAML in Markdown or Astro files) */
	readonly ignoreFrontMatter?: boolean;
	/** How to distinguish authored (component) element names from native HTML elements */
	readonly authoredElementName?: ParserAuthoredElementNameDistinguishing;
};

/**
 * Configuration for distinguishing authored (component) elements from native HTML elements.
 * Can be a string pattern, a RegExp, a predicate function, or an array of these.
 */
export type ParserAuthoredElementNameDistinguishing =
	| string
	| Readonly<RegExp>
	| Readonly<ParserAuthoredElementNameDistinguishingFunction>
	| readonly (string | Readonly<RegExp> | ParserAuthoredElementNameDistinguishingFunction)[];

/**
 * A predicate function that returns `true` if the given element name
 * should be treated as an authored (component) element.
 *
 * @param name - The element name to test
 * @returns `true` if the name represents an authored element
 */
export type ParserAuthoredElementNameDistinguishingFunction = (name: string) => boolean;

/**
 * @deprecated
 */
export type Parse = MLMarkupLanguageParser['parse'];

/**
 * Callback function used for walking through AST nodes.
 *
 * @template Node - The specific AST node type being walked
 * @param node - The current node being visited
 * @param sequentailPrevNode - The previous node in sequential (document) order, or `null`
 * @param depth - The nesting depth of the current node
 */
export type Walker<Node extends MLASTNodeTreeItem> = (
	node: Node,
	sequentailPrevNode: MLASTNodeTreeItem | null,
	depth: number,
) => void;

/**
 * Standard namespace URIs for HTML, SVG, MathML, and XLink.
 */
export type NamespaceURI =
	| 'http://www.w3.org/1999/xhtml'
	| 'http://www.w3.org/2000/svg'
	| 'http://www.w3.org/1998/Math/MathML'
	| 'http://www.w3.org/1999/xlink';

/**
 * Short namespace identifiers used internally by markuplint.
 *
 * - `'html'`  – XHTML namespace
 * - `'svg'`   – SVG namespace
 * - `'mml'`   – MathML namespace
 * - `'xlink'` – XLink namespace
 */
export type Namespace = 'html' | 'svg' | 'mml' | 'xlink';
