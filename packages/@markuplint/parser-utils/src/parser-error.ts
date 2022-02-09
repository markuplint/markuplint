export class ParserError extends Error {
	name = 'ParserError';
	readonly line: number;
	readonly col: number;
	readonly raw: string;
	readonly nodeName: string | null;
	constructor(
		message: string,
		{
			line = 1,
			col = 0,
			raw = '',
			nodeName = null,
		}: {
			line?: number;
			col?: number;
			raw?: string;
			nodeName?: string | null;
		},
	) {
		super(nodeName ? `The ${nodeName} is invalid element (${line}:${col}): ${message}` : message);

		this.line = line;
		this.col = col;
		this.raw = raw;
		this.nodeName = nodeName;
	}
}
