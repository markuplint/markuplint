import type { MLASTToken } from '@markuplint/ml-ast';
import { getEndCol, getEndLine } from '@markuplint/parser-utils/location';

/**
 * Represents a single token in the markuplint AST.
 * Wraps an AST token with positional information (line, column, offset)
 * and provides the raw string representation.
 *
 * @template A - The AST token type this token wraps
 */
export class MLToken<A extends MLASTToken = MLASTToken> {
	readonly #raw: string;

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
		this.uuid = astToken.uuid;
	}

	/**
	 * The ending column number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endCol() {
		return getEndCol(this.raw, this.startCol);
	}

	/**
	 * The ending line number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endLine() {
		return getEndLine(this.raw, this.startLine);
	}

	/**
	 * The ending character offset (0-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endOffset() {
		return this.startOffset + this.raw.length;
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
		return this._astToken.col;
	}

	/**
	 * The starting line number (1-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startLine() {
		return this._astToken.line;
	}

	/**
	 * The starting character offset (0-based) of this token in the source.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startOffset() {
		return this._astToken.offset;
	}

	/**
	 * Returns the raw string representation of this token.
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 * @returns The string content of this token
	 */
	toString() {
		return this.#raw;
	}
}
