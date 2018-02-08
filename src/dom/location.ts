export default class Location {
	public readonly line: number;
	public readonly col: number;
	public readonly endLine: number;
	public readonly endCol: number;
	public readonly startOffset: number;
	public readonly endOffset: number;

	constructor (line: number, col: number, endLine: number, endCol: number, startOffset: number, endOffset: number) {
		this.line = line;
		this.col = col;
		this.endLine = endLine;
		this.endCol = endCol;
		this.startOffset = startOffset;
		this.endOffset = endOffset;
	}

	public toJSON () {
		return {
			line: this.line,
			col: this.col,
			endLine: this.endLine,
			endCol: this.endCol,
			startOffset: this.startOffset,
			endOffset: this.endOffset,
		};
	}
}
