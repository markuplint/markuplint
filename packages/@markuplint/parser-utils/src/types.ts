import type {
	EndTagType,
	MLASTParentNode,
	MLASTParseError,
	ParserOptions as ConfigParserOptions,
} from '@markuplint/ml-ast';

/**
 * Configuration options for initializing a Parser instance,
 * controlling how the parser handles tags, attributes, and whitespace.
 */
export type ParserOptions = {
	readonly booleanish?: boolean;
	readonly endTagType?: EndTagType;
	readonly ignoreTags?: readonly IgnoreTag[];
	readonly maskChar?: string;
	readonly tagNameCaseSensitive?: boolean;
	readonly selfCloseType?: SelfCloseType;
	readonly spaceChars?: readonly string[];
	readonly rawTextElements?: readonly string[];
};

/**
 * Options passed to a single parse invocation, extending the base config parser options
 * with offset positioning and depth control for embedded code fragments.
 */
export type ParseOptions = ConfigParserOptions & {
	readonly offsetOffset?: number;
	readonly offsetLine?: number;
	readonly offsetColumn?: number;
	readonly depth?: number;
};

/**
 * The result of tokenizing raw source code, containing the AST nodes
 * and metadata about whether the parsed content is a document fragment.
 *
 * @template N - The AST node type produced by the tokenizer
 * @template State - The parser state type carried through tokenization
 */
export type Tokenized<N extends {} = {}, State extends unknown = null> = {
	readonly ast: N[];
	readonly isFragment: boolean;
	readonly state?: State;
	/**
	 * Non-fatal parser conformance errors collected during tokenisation.
	 * Optional — parsers that have no equivalent surface (e.g., raw regex
	 * tokenizers) simply omit it. Propagated unchanged onto
	 * `MLASTDocument.parseErrors` by {@link Parser.parse}.
	 */
	readonly parseErrors?: readonly MLASTParseError[];
};

/**
 * A minimal source token representing a raw string fragment
 * along with its starting position in the source code.
 */
export type Token = {
	readonly raw: string;
	readonly offset: number;
	readonly line: number;
	readonly col: number;
};

/**
 * A token that belongs to a parent node in the AST, extending the base Token
 * with nesting depth and a reference to the enclosing parent node.
 */
export type ChildToken = Token & {
	readonly depth: number;
	readonly parentNode: MLASTParentNode | null;
};

/**
 * Determines how self-closing tags (e.g., `<br />`) are interpreted.
 *
 * - `"html"`: Only void elements are treated as self-closing (HTML spec behavior)
 * - `"xml"`: The self-closing solidus (`/`) determines self-closing behavior
 * - `"html+xml"`: Either void elements or the self-closing solidus cause self-closing
 */
export type SelfCloseType = 'html' | 'xml' | 'html+xml';

/**
 * Represents a tagged code block (e.g., template expressions or preprocessor directives)
 * that was extracted from the source during the ignore-block phase.
 */
export type Code = {
	readonly type: string;
	readonly index: number;
	readonly startTag: string;
	readonly taggedCode: string;
	readonly endTag: string | null;
	resolved: boolean;
};

/**
 * Defines a pattern for identifying blocks of code that should be masked
 * (replaced with placeholder characters) before parsing, such as template
 * language expressions or preprocessor directives.
 */
export type IgnoreTag = {
	readonly type: string;
	readonly start: Readonly<RegExp> | string;
	readonly end: Readonly<RegExp> | string;
};

/**
 * The result of masking ignore-tagged code blocks in the source, preserving
 * the original source alongside the replaced version and a stack of extracted codes.
 */
export type IgnoreBlock = {
	readonly source: string;
	readonly replaced: string;
	readonly stack: readonly Code[];
	readonly maskChar: string;
};

/**
 * Defines a pair of quote delimiters and the value type they enclose,
 * used when parsing attribute values with non-standard quoting
 * (e.g., JSX expression braces or template literals).
 */
export type QuoteSet = {
	readonly start: string;
	readonly end: string;
	readonly type: ValueType;
	readonly parser?: CustomParser;
};

/**
 * A function that attempts to parse a code string, throwing a SyntaxError
 * if the code is invalid. Used by the safe script parser to determine
 * the boundary of valid script content.
 */
export type CustomParser = (code: string) => void;

/**
 * The semantic type of an attribute value, distinguishing between
 * plain string values and script/expression values.
 */
export type ValueType = 'string' | 'script';
