import { MLToken } from '@markuplint/ml-ast';
import { Rules } from '@markuplint/ml-config';

export default class MLDOMToken<A extends MLToken> {
	readonly uuid: string;
	readonly startLine: number;
	readonly endLine: number;
	readonly startCol: number;
	readonly endCol: number;
	readonly startOffset: number;
	readonly endOffset: number;
	readonly rules: Rules = {};

	protected readonly _astToken: A;

	// readonly #originRaw: string;
	#fixed: string;

	constructor(astToken: A) {
		this._astToken = astToken;
		// this.#originRaw = astToken.raw;
		this.#fixed = astToken.raw;
		this.uuid = astToken.uuid;
		this.startLine = astToken.startLine;
		this.endLine = astToken.endLine;
		this.startCol = astToken.startCol;
		this.endCol = astToken.endCol;
		this.startOffset = astToken.startOffset;
		this.endOffset = astToken.endOffset;
	}

	get raw() {
		return this.#fixed;
	}

	fix(raw: string) {
		this.#fixed = raw;
	}
}
