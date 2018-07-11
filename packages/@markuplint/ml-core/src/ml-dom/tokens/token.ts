import { MLASTNode } from '@markuplint/ml-ast/';

export default class Token {
	public readonly startLine: number;
	public readonly endLine: number;
	public readonly startCol: number;
	public readonly endCol: number;
	public readonly startOffset: number;
	public readonly endOffset: number;

	private readonly _originRaw: string;
	private _fixed: string;

	constructor(astNode: MLASTNode) {
		this._originRaw = astNode.raw;
		this._fixed = astNode.raw;
		this.startLine = astNode.startLine;
		this.endLine = astNode.endLine;
		this.startCol = astNode.startCol;
		this.endCol = astNode.endCol;
		this.startOffset = astNode.startOffset;
		this.endOffset = astNode.endOffset;
	}

	public get raw() {
		return this._fixed;
	}

	public toJSON() {
		return {
			raw: this.raw,
			startLine: this.startLine,
			endLine: this.endLine,
			startCol: this.startCol,
			endCol: this.endCol,
			startOffset: this.startOffset,
			endOffset: this.endOffset,
		};
	}

	public fix(raw: string) {
		this._fixed = raw;
	}
}
