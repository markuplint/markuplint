import type { MLASTToken } from '@markuplint/ml-ast';
import { getEndCol, getEndLine } from '@markuplint/parser-utils/location';

export class MLToken<A extends MLASTToken = MLASTToken> {
	#fixed: string;
	readonly #raw: string;

	readonly uuid: string;

	protected readonly _astToken: A;

	constructor(astToken: A) {
		this._astToken = astToken;
		this.#raw = astToken.raw;
		this.#fixed = astToken.raw;
		this.uuid = astToken.uuid;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endCol() {
		return getEndCol(this.fixed, this.startCol);
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endLine() {
		return getEndLine(this.fixed, this.startLine);
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get endOffset() {
		return this.startOffset + this.fixed.length;
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
		return this._astToken.col;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startLine() {
		return this._astToken.line;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDOMToken`
	 */
	get startOffset() {
		return this._astToken.offset;
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
