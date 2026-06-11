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
 *
 * Adding a value here requires a corresponding `case` in `ml-core`'s
 * `createNode()` (`packages/@markuplint/ml-core/src/ml-dom/helper/create-node.ts`);
 * an unhandled value throws `TypeError: Invalid AST node types` at runtime.
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
 *
 * End positions (`endOffset`, `endLine`, `endCol`) are not stored;
 * they can be derived from `offset + raw.length`, or via helper utilities
 * in `@markuplint/parser-utils`.
 */
export interface MLASTToken {
	/**
	 * Unique identifier for this token instance.
	 *
	 * Cross-references between nodes (`parentNodeUuid`, `pairNodeUuid`) use
	 * UUID strings rather than object references so the AST stays free of
	 * circular references and can be serialized as JSON; consumers resolve a
	 * UUID against `MLASTDocument.nodeList`.
	 */
	readonly uuid: string;
	/** The original raw source text of this token */
	readonly raw: string;
	/** Zero-based character offset of the token start in the source */
	readonly offset: number;
	/** One-based line number where the token starts */
	readonly line: number;
	/** One-based column number where the token starts */
	readonly col: number;
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
	/** UUID of the parent node, or `null` for top-level nodes */
	readonly parentNodeUuid: string | null;
	/**
	 * @internal Temporary object reference set during parsing and removed by post-processing.
	 * Use {@link parentNodeUuid} instead.
	 */
	readonly parentNode?: MLASTParentNode | null;
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
	readonly namespace: NamespaceURI;
	/** Whether the element is native HTML, a Web Component, or an authored component */
	readonly elementType: ElementType;
	/** Whether this element acts as a fragment (no actual DOM node, e.g. a JSX fragment `<>` or a Vue `<template>` wrapper) */
	readonly isFragment: boolean;
	/** Attributes on this element */
	readonly attributes: readonly MLASTAttr[];
	/** Whether the element has one or more spread attributes */
	readonly hasSpreadAttr?: boolean;
	/** Direct child nodes of this element */
	readonly childNodes: readonly MLASTChildNode[];
	/** Block behavior associated with this element, if any */
	readonly blockBehavior: MLASTBlockBehavior | null;
	/** UUID of the matching closing tag, or `null` for void / self-closing elements */
	readonly pairNodeUuid: string | null;
	/**
	 * @internal Temporary object reference set during parsing and removed by post-processing.
	 * Use {@link pairNodeUuid} instead.
	 */
	readonly pairNode?: MLASTElementCloseTag | null;
	/** The characters that open this tag (usually `"<"`) */
	readonly tagOpenChar: string;
	/** The characters that close this tag (usually `">"`) */
	readonly tagCloseChar: string;
	/** Whether this element is a ghost node (omitted tag inferred by the parser, e.g. an implicit `<tbody>`); ghost nodes have an empty `raw` */
	readonly isGhost: boolean;
}

/**
 * A closing element tag (e.g. `</div>`).
 * Always paired with an {@link MLASTElement} via `pairNodeUuid`.
 *
 * Close tags are not part of DOM tree traversal in `ml-core`: `createNode()`
 * skips `'endtag'` entries in the node list, and the paired `MLElement`
 * instead resolves `pairNodeUuid` to create its `MLElementCloseTag`, which
 * exists only as a satellite of that element.
 */
export interface MLASTElementCloseTag extends MLASTAbstractNode {
	readonly type: 'endtag';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** UUID of the matching opening element tag */
	readonly pairNodeUuid: string | null;
	/**
	 * @internal Temporary object reference set during parsing and removed by post-processing.
	 * Use {@link pairNodeUuid} instead.
	 */
	readonly pairNode?: MLASTElement;
	/** The characters that open this tag (usually `"</"`) */
	readonly tagOpenChar: string;
	/** The characters that close this tag (usually `">"`) */
	readonly tagCloseChar: string;
}

/**
 * A preprocessor-specific block node, representing control-flow constructs
 * from template engines and frameworks (e.g. `{#if}`, `{#each}` in Svelte,
 * `v-if` blocks in Vue, `<% if %>` in EJS/ERB).
 *
 * In `ml-core` this maps to `MLBlock` — a markuplint-specific extension with
 * the custom `nodeType` `101` (no DOM Standard equivalent) — which acts as a
 * transparent container: its children are treated as belonging to the parent
 * node for tree traversal purposes.
 */
export interface MLASTPreprocessorSpecificBlock extends MLASTAbstractNode {
	readonly type: 'psblock';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/** The block's name as determined by the parser */
	readonly nodeName: string;
	/** Whether this block acts as a transparent fragment */
	readonly isFragment: boolean;
	/** Direct child nodes within this block */
	readonly childNodes: readonly MLASTChildNode[];
	/** Block behavior associated with this block, or `null` when the block has no control-flow semantic (e.g. a pure expression output like `<%= expr %>` in EJS) */
	readonly blockBehavior: MLASTBlockBehavior | null;
	/** Whether this block is bogus (unparsable or malformed) */
	readonly isBogus: boolean;
}

/**
 * Describes the behavior of a preprocessor block or element,
 * capturing both the kind of control-flow construct and the
 * source expression that drives it.
 *
 * `ml-core` uses the `type` to enumerate conditional branches
 * (`conditionalChildNodes()`) so content-model rules such as
 * `permitted-contents` can analyze each branch separately.
 */
export interface MLASTBlockBehavior {
	/** The kind of block behavior (e.g. `'if'`, `'each'`, `'await'`) */
	readonly type: MLASTBlockBehaviorType;
	/** The source expression associated with this block */
	readonly expression: string;
}

/**
 * The type of control-flow construct represented by a block behavior.
 */
export type MLASTBlockBehaviorType =
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
	| 'end';

/**
 * An HTML comment node (e.g. `<!-- ... -->`).
 */
export interface MLASTComment extends MLASTAbstractNode {
	readonly type: 'comment';
	readonly nodeName: '#comment';
	/** Nesting depth in the document tree */
	readonly depth: number;
	/**
	 * Whether the comment is bogus (malformed per the HTML parsing spec,
	 * e.g. `<!...>` or a processing instruction such as `<?xml ... ?>`).
	 * The parser still captures these as comment nodes but flags them so
	 * lint rules can report them.
	 */
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
 *
 * This is a recovery node: the parser captures unparsable content instead of
 * failing the whole parse. It is never preserved as-is in the DOM —
 * `ml-core` converts it to an `MLElement` named `x-invalid` (when `kind` is
 * `'starttag'`) or to an `MLText` (otherwise), so lint rules can still
 * operate on the content based on the parser's best guess.
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
 *
 * The decomposition exists so lint rules can validate whitespace around the
 * equal sign, quoting style, and attribute naming conventions with precise
 * source locations. For boolean attributes without a value (e.g.
 * `disabled`), the `equal`, `startQuote`, `value`, and `endQuote` tokens
 * still exist but have empty `raw` strings.
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
	/** The resolved attribute name when the actual name is a framework-specific directive (e.g. Vue's `:class` resolves to `class`, `@click` to `onclick`) */
	readonly potentialName?: string;
	/** The resolved attribute value when the actual value is dynamic */
	readonly potentialValue?: string;
	/** The semantic type of the attribute value */
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';
	/** A candidate attribute name for auto-correction */
	readonly candidate?: string;
	/** Whether this attribute is allowed to appear multiple times on the same element (e.g. `class` in template engines that merge values) */
	readonly isDuplicatable: boolean;
}

/**
 * A spread attribute node (e.g. `{...props}` in JSX).
 *
 * Minimal by design: a spread cannot be statically decomposed into
 * name/value tokens, so only the positional token information is kept.
 */
export interface MLASTSpreadAttr extends MLASTToken {
	readonly type: 'spread';
	readonly nodeName: '#spread';
}

/**
 * Stable identifier for a non-fatal parser conformance error. The full set
 * mirrors parse5's `ERR` enum (HTML LS tokenizer / tree-construction parse
 * errors) — each value is a kebab-case string that appears verbatim in the
 * `code` field of `MLASTParseError` and as the key in
 * `severity.parseError`'s `Record` form.
 *
 * Source of truth: `parse5/dist/common/error-codes.d.ts`. When parse5
 * adds a new code, append it here and update the migration guide.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
 */
export type MLASTParseErrorCode =
	// Input stream
	| 'control-character-in-input-stream'
	| 'noncharacter-in-input-stream'
	| 'surrogate-in-input-stream'
	// Tag syntax
	| 'non-void-html-element-start-tag-with-trailing-solidus'
	| 'end-tag-with-attributes'
	| 'end-tag-with-trailing-solidus'
	| 'unexpected-solidus-in-tag'
	| 'unexpected-null-character'
	| 'unexpected-question-mark-instead-of-tag-name'
	| 'invalid-first-character-of-tag-name'
	| 'unexpected-equals-sign-before-attribute-name'
	| 'missing-end-tag-name'
	| 'unexpected-character-in-attribute-name'
	// Character reference
	| 'unknown-named-character-reference'
	| 'missing-semicolon-after-character-reference'
	| 'absence-of-digits-in-numeric-character-reference'
	| 'null-character-reference'
	| 'surrogate-character-reference'
	| 'character-reference-outside-unicode-range'
	| 'control-character-reference'
	| 'noncharacter-character-reference'
	// Attribute
	| 'unexpected-character-in-unquoted-attribute-value'
	| 'missing-attribute-value'
	| 'missing-whitespace-between-attributes'
	| 'duplicate-attribute'
	// DOCTYPE
	| 'unexpected-character-after-doctype-system-identifier'
	| 'missing-whitespace-after-doctype-public-keyword'
	| 'missing-whitespace-between-doctype-public-and-system-identifiers'
	| 'missing-whitespace-after-doctype-system-keyword'
	| 'missing-quote-before-doctype-public-identifier'
	| 'missing-quote-before-doctype-system-identifier'
	| 'missing-doctype-public-identifier'
	| 'missing-doctype-system-identifier'
	| 'abrupt-doctype-public-identifier'
	| 'abrupt-doctype-system-identifier'
	| 'missing-whitespace-before-doctype-name'
	| 'missing-doctype-name'
	| 'invalid-character-sequence-after-doctype-name'
	| 'non-conforming-doctype'
	| 'missing-doctype'
	| 'misplaced-doctype'
	| 'eof-in-doctype'
	// Comment
	| 'incorrectly-opened-comment'
	| 'incorrectly-closed-comment'
	| 'nested-comment'
	| 'abrupt-closing-of-empty-comment'
	| 'eof-in-comment'
	// CDATA / script-comment-like text
	| 'cdata-in-html-content'
	| 'eof-in-cdata'
	| 'eof-in-script-html-comment-like-text'
	// EOF
	| 'eof-before-tag-name'
	| 'eof-in-tag'
	| 'eof-in-element-that-can-contain-only-text'
	// Tree construction
	| 'end-tag-without-matching-open-element'
	| 'closing-of-element-with-open-child-elements'
	| 'disallowed-content-in-noscript-in-head'
	| 'open-elements-left-after-eof'
	| 'abandoned-head-element-child'
	| 'misplaced-start-tag-for-head-element'
	| 'nested-noscript-in-head';

/**
 * Non-fatal parser-level conformance error emitted by the underlying parser
 * during tokenisation (e.g., parse5's `onParseError` events). Unlike
 * `unknownParseError` these do not abort the parse — the document is still
 * usable — but they correspond to HTML LS tokenizer / tree-construction
 * conformance errors that the `parse-error` rule surfaces as lint
 * violations.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
 */
export interface MLASTParseError {
	/**
	 * Stable kebab-case identifier from the underlying parser. The current
	 * full enumeration mirrors parse5's `ERR` enum and is captured by
	 * {@link MLASTParseErrorCode}; framework parsers that surface a code
	 * outside that set should still use a kebab-case identifier so user
	 * configuration (`severity.parseError`) can target it.
	 */
	readonly code: MLASTParseErrorCode;
	/** Zero-based offset into the source where the error starts. */
	readonly startOffset: number;
	/** 1-based line where the error starts. */
	readonly startLine: number;
	/** 1-based column where the error starts. */
	readonly startCol: number;
	/** Zero-based offset into the source where the error ends. */
	readonly endOffset: number;
	/** 1-based line where the error ends. */
	readonly endLine: number;
	/** 1-based column where the error ends. */
	readonly endCol: number;
	/** The slice of the source between `startOffset` and `endOffset`. */
	readonly raw: string;
}

/**
 * The root document node returned by a parser.
 * Contains the full node list and metadata about the parse result.
 */
export interface MLASTDocument {
	/** The full original source code */
	readonly raw: string;
	/**
	 * Depth-first flattened list of all AST nodes in document order (the
	 * order they appear in the source) — nodes also appear in their parent's
	 * `childNodes`. UUID cross-references (`parentNodeUuid`, `pairNodeUuid`)
	 * are resolved against this list, so every node referenced by UUID must
	 * be present in it.
	 */
	readonly nodeList: readonly MLASTNodeTreeItem[];
	/** Whether the document is a fragment (no root element required) */
	readonly isFragment: boolean;
	/** A description of any unknown parse error that occurred, if any */
	readonly unknownParseError?: string;
	/**
	 * Non-fatal parser-level conformance errors collected during tokenisation.
	 * Populated by parsers that support it (e.g., `@markuplint/html-parser`
	 * via parse5's `onParseError`); omitted otherwise. Consumed by
	 * `@markuplint/ml-core`'s verify pipeline, which surfaces each entry as a
	 * `ruleId: 'parse-error'` violation (sharing the channel with fatal
	 * `ParserError`s; controlled by `severity.parseError`).
	 *
	 * **Order contract**: entries must appear in the order the parser emitted
	 * them, and `ml-core` pushes them onto the violations list **before** any
	 * rule iteration runs — so they always precede rule-level violations in
	 * test fixtures and reporter output. Custom parsers populating this field
	 * must preserve emit order; downstream consumers (including 80+ rule spec
	 * files) rely on it.
	 */
	readonly parseErrors?: readonly MLASTParseError[];
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
	/**
	 * Override how the underlying HTML parser decides between full-document
	 * and fragment parsing.
	 *
	 * - `'auto'` (default) — inspect the source: input starting with
	 *   `<!doctype html>` or `<html>` is treated as a full document;
	 *   anything else as a fragment. Backwards-compatible behaviour.
	 * - `'document'` — force full-document parsing. Use for sources that
	 *   are complete HTML pages without an explicit doctype, so that
	 *   document-level parse5 errors (`missing-doctype`, `misplaced-doctype`,
	 *   etc.) surface via the `parse-error` channel.
	 * - `'fragment'` — force fragment parsing. Use for SSR / template
	 *   partials whose source intentionally starts with `<head>`, `<meta>`,
	 *   `<title>`, … as legitimate inserted chunks (parse5 should not emit
	 *   `missing-doctype` for those).
	 *
	 * Template-engine parsers that internally re-invoke the HTML parser for
	 * embedded HTML chunks (Markdown HTML blocks, Pug raw HTML output, …)
	 * pass `'fragment'` to that internal call by default; users can still
	 * override that via `parserOptions` when their template legitimately
	 * carries a full document.
	 */
	readonly documentMode?: 'auto' | 'document' | 'fragment';
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
