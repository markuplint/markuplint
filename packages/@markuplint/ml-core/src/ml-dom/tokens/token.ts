import { MLToken } from '@markuplint/ml-ast';
import { Rules } from '@markuplint/ml-config';

export default class Token<A extends MLToken> {
	public readonly uuid: string;
	public readonly startLine: number;
	public readonly endLine: number;
	public readonly startCol: number;
	public readonly endCol: number;
	public readonly startOffset: number;
	public readonly endOffset: number;
	public readonly rules: Rules = {};

	protected readonly _astToken: A;

	private readonly _originRaw: string;
	private _fixed: string;

	constructor(astToken: A) {
		this._astToken = astToken;
		this._originRaw = astToken.raw;
		this._fixed = astToken.raw;
		this.uuid = astToken.uuid;
		this.startLine = astToken.startLine;
		this.endLine = astToken.endLine;
		this.startCol = astToken.startCol;
		this.endCol = astToken.endCol;
		this.startOffset = astToken.startOffset;
		this.endOffset = astToken.endOffset;
	}

	public get raw() {
		return this._fixed;
	}

	public fix(raw: string) {
		this._fixed = raw;
	}
}
