import type { cssSyntaxMatch } from './css-syntax.js';

/**
 * Re-exported types from the auto-generated schema definitions.
 *
 * - `Type` - Union of all possible type definitions (keyword, list, enum, number, directive)
 * - `List` - Defines space-separated or comma-separated token sequences
 * - `Enum` - Defines a fixed set of allowed string values
 * - `CssSyntax` - String literal union of all recognized CSS value definition syntax names
 * - `KeywordDefinedType` - Union of CSS syntax, extended types, and HTML attribute requirements
 * - `Number` - Defines numeric validation with optional range constraints
 * - `Directive` - Defines composite attribute values with separators and individual token validation
 */
export type { Type, List, Enum, CssSyntax, KeywordDefinedType, Number, Directive, Pattern } from './types.schema.js';

/**
 * The outcome of a type validation check. Either a successful match
 * or a detailed mismatch containing error location and reason.
 */
export type Result = UnmatchedResult | MatchedResult;

/**
 * Represents a failed type validation result. Contains detailed information
 * about what went wrong, including the position within the input string
 * where the mismatch occurred and the specific reason for the failure.
 */
export type UnmatchedResult = {
	readonly matched: false;
	readonly ref: string | null;
	readonly raw: string;
	readonly length: number;
	readonly offset: number;
	readonly line: number;
	readonly column: number;
	readonly reason: UnmatchedResultReason;
	readonly passCount?: number;
} & UnmatchedResultOptions;

/**
 * Optional metadata attached to an unmatched result, providing additional
 * context such as the part of the value that failed, what was expected,
 * and potential corrections or fallbacks.
 */
export type UnmatchedResultOptions = {
	readonly partName?: string;
	readonly expects?: readonly Expect[];
	readonly extra?: Expect;
	readonly candidate?: string;
	readonly fallbackTo?: string;
};

/**
 * Describes the specific reason a type validation failed. Can be a simple
 * string identifier for common failure modes (e.g., `'syntax-error'`,
 * `'typo'`, `'out-of-range'`) or a structured object for range violations
 * that includes the boundary values.
 */
export type UnmatchedResultReason =
	| 'syntax-error'
	| 'typo'
	| 'missing-token'
	| 'missing-comma'
	| 'unexpected-token'
	| 'unexpected-space'
	| 'unexpected-newline'
	| 'unexpected-comma'
	| 'empty-token'
	| 'out-of-range'
	| 'doesnt-exist-in-enum'
	| 'duplicated'
	| 'illegal-combination'
	| 'illegal-order'
	| 'extra-token'
	| 'must-be-percent-encoded'
	| 'must-be-serialized'
	| {
			readonly type: 'out-of-range';
			readonly gt?: number;
			readonly gte?: number;
			readonly lt?: number;
			readonly lte?: number;
	  }
	| {
			readonly type: 'out-of-range-length-char';
			readonly gte: number;
			readonly lte?: number;
	  }
	| {
			readonly type: 'out-of-range-length-digit';
			readonly gte: number;
			readonly lte?: number;
	  };

/**
 * Represents a successful type validation result, indicating that the
 * checked value conforms to the specified type definition.
 */
export type MatchedResult = {
	readonly matched: true;
};

/**
 * Describes an expected value or format that the input should conform to.
 * Used in error reporting to communicate what the validator anticipated.
 */
export type Expect = {
	readonly type: 'const' | 'format' | 'syntax' | 'regexp' | 'common';
	readonly value: string;
};

/**
 * A predicate function that checks whether a string value conforms
 * to a specific primitive type format (e.g., a valid custom element name).
 *
 * @param value - The string value to check
 * @returns True if the value is valid for the primitive type
 */
export type FormattedPrimitiveTypeCheck = (value: string) => boolean;

/**
 * A factory function that creates a {@link FormattedPrimitiveTypeCheck} predicate,
 * optionally configured with the given options.
 *
 * @template O - The type of the optional configuration object passed to the factory
 * @param options - Optional configuration for the created checker
 * @returns A predicate function that validates strings against the primitive type
 */
export type FormattedPrimitiveTypeCreator<O = never> = (options?: O) => FormattedPrimitiveTypeCheck;

/**
 * A read-only map of type definition names to their corresponding custom
 * syntax or CSS syntax definitions. Used by the type checker to resolve
 * keyword types during validation.
 */
export type Defs = Readonly<Record<string, CustomCssSyntax | CustomSyntax>>;

/**
 * Defines a custom type using a programmatic checker function.
 * Unlike CSS syntax definitions, custom syntax types use an imperative
 * `is` function to validate values.
 */
export type CustomSyntax = {
	readonly ref: string;
	readonly expects?: readonly Expect[];
	readonly is: CustomSyntaxCheck;
};

/**
 * A function that validates a string value against a custom syntax rule
 * and returns a detailed result indicating match or mismatch.
 *
 * @param value - The string value to validate
 * @returns A result indicating whether the value matches the custom syntax
 */
export type CustomSyntaxCheck = (value: string) => Result;
/**
 * A factory function that creates a {@link CustomSyntaxCheck} validator,
 * optionally configured with the given options.
 *
 * @template O - The type of the optional configuration object passed to the factory
 * @param options - Optional configuration for the created checker
 * @returns A function that validates strings against the custom syntax
 */
export type CustomSyntaxChecker<O = {}> = (options?: O) => CustomSyntaxCheck;

/**
 * Defines a custom type using CSS value definition syntax for matching.
 * The `syntax` property specifies the CSS grammar to apply, along with
 * any supplementary definitions needed for parsing.
 */
export type CustomCssSyntax = {
	readonly ref: string;
	readonly caseSensitive?: boolean;
	readonly expects?: readonly Expect[];
	readonly syntax: {
		readonly apply: `<${string}>`;
		readonly def: Readonly<Record<string, string | CssSyntaxTokenizer>>;
		/**
		 * @deprecated
		 */
		readonly ebnf?: Readonly<Record<string, string | readonly string[]>>;
		/**
		 * @deprecated
		 */
		readonly properties?: Readonly<Record<string, string>>;
	};
};

/**
 * Represents a single token produced by the CSS syntax tokenizer.
 * Each token captures its type, raw string value, position within
 * the input, and a balance index for matching paired delimiters.
 */
export type CSSSyntaxToken = {
	readonly type: number;
	readonly value: string;
	readonly index: number;
	readonly balance: number;
	readonly node?: any;
};

/**
 * A custom tokenizer function used within CSS syntax definitions to
 * perform token-level matching. It receives the current token, a
 * function to peek ahead in the token stream, and the CSS syntax
 * match utility.
 *
 * @param token - The current CSS syntax token to inspect, or null if at end of input
 * @param getNextToken - A lookahead function that retrieves a token at the given offset
 * @param match - The CSS syntax matching function for recursive grammar matching
 * @returns The number of tokens consumed by this tokenizer (0 if no match)
 */
export type CssSyntaxTokenizer = (
	token: Readonly<CSSSyntaxToken> | null,
	getNextToken: GetNextToken,
	match: typeof cssSyntaxMatch,
) => number;

/**
 * A lookahead function that retrieves a CSS syntax token at a given
 * offset from the current position in the token stream.
 *
 * @param length - The offset (number of tokens ahead) to look up
 * @returns The token at the given offset, or null if beyond the end of the token stream
 */
export type GetNextToken = (length: number) => CSSSyntaxToken | null;
