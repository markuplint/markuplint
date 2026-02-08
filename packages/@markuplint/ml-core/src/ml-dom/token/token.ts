import type { MLASTToken } from '@markuplint/ml-ast';

/**
 * Represents a single token in the markuplint AST.
 * Wraps an AST token with positional information (line, column, offset)
 * and provides both raw and fixed string representations.
 *
 * @template A - The AST token type this token wraps
 */
export class MLToken<A extends MLASTToken = MLASTToken> {
	readonly #endCol: number;
	readonly #endLine: number;
	readonly #endOffset: number;
	#fixed: string;
	readonly #raw: string;
	readonly #startCol: number;
	readonly #startLine: number;
	readonly #startOffset: number;

	/**
	 * The unique identifier for this token.
	 */
	readonly uuid: string;

	/**
	 * The underlying AST token that this token wraps.
	 */
	protected readonly _astToken: A;

	/**
	 * Creates a new MLToken instance from an AST token.
	 *
	 * @param astToken - The AST token to wrap
	 */
	constructor(astToken: A) {
		this._astToken = astToken;
		this.#raw = astToken.raw;
		this.#fixed = astToken.raw;
		this.uuid = astToken.uuid;
		this.#startLine = astToken.startLine;
		this.#endLine = astToken.endLine;
		this.#startCol = astToken.startCol;
		this.#endCol = astToken.endCol;
		this.#startOffset = astToken.startOffset;
		this.#endOffset = astToken.endOffset;
	}

	/**
	 * The ending column number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endCol() {
		return this.#endCol;
	}

	/**
	 * The ending line number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endLine() {
		return this.#endLine;
	}

	/**
	 * The ending character offset (0-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endOffset() {
		return this.#endOffset;
	}

	/**
	 * The fixed (potentially modified) string content of this token.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get fixed() {
		return this.#fixed;
	}

	/**
	 * The original raw string content of this token from the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get raw() {
		return this.#raw;
	}

	/**
	 * The starting column number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startCol() {
		return this.#startCol;
	}

	/**
	 * The starting line number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startLine() {
		return this.#startLine;
	}

	/**
	 * The starting character offset (0-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startOffset() {
		return this.#startOffset;
	}

	/**
	 * Replaces the fixed content of this token with the given string,
	 * used when applying lint fixes.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 * @param raw - The new string content to set as the fixed value
	 */
	fix(raw: string) {
		this.#fixed = raw;
	}

	/**
	 * Returns the string representation of this token.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 * @param fixed - When true, returns the fixed content; otherwise returns the original raw content
	 * @returns The string content of this token
	 */
	toString(fixed = false) {
		return fixed ? this.#fixed : this.#raw;
	}
}
