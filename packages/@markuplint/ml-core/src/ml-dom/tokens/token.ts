import type { MLToken } from '@markuplint/ml-ast';
import type { Rules } from '@markuplint/ml-config';

export default class MLDOMToken<A extends MLToken> {
	readonly uuid: string;
	readonly rules: Rules = {};

	readonly #startLine: number;
	readonly #endLine: number;
	readonly #startCol: number;
	readonly #endCol: number;
	readonly #startOffset: number;
	readonly #endOffset: number;

	protected readonly _astToken: A;

	readonly #raw: string;
	#fixed: string;

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

	get originRaw() {
		return this.#raw;
	}

	get raw() {
		return this.#fixed;
	}

	get startOffset() {
		return this.#startOffset;
	}

	get endOffset() {
		return this.#endOffset;
	}

	get startLine() {
		return this.#startLine;
	}

	get endLine() {
		return this.#endLine;
	}

	get startCol() {
		return this.#startCol;
	}

	get endCol() {
		return this.#endCol;
	}

	fix(raw: string) {
		this.#fixed = raw;
	}
}
