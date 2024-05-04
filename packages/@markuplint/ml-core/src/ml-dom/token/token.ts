import type { MLASTToken } from '@markuplint/ml-ast';

export class MLToken<A extends MLASTToken = MLASTToken> {
	readonly #endCol: number;
	readonly #endLine: number;
	readonly #endOffset: number;
	#fixed: string;
	readonly #raw: string;
	readonly #startCol: number;
	readonly #startLine: number;
	readonly #startOffset: number;

	readonly uuid: string;

	protected readonly _astToken: A;

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
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endCol() {
		return this.#endCol;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endLine() {
		return this.#endLine;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endOffset() {
		return this.#endOffset;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get fixed() {
		return this.#fixed;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get raw() {
		return this.#raw;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startCol() {
		return this.#startCol;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startLine() {
		return this.#startLine;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startOffset() {
		return this.#startOffset;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	fix(raw: string) {
		this.#fixed = raw;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	toString(fixed = false) {
		return fixed ? this.#fixed : this.#raw;
	}
}
