export class ParserError extends Error {
	readonly col: number;
	readonly line: number;
	name = 'ParserError';
	readonly nodeName: string | null;
	readonly raw: string;

	constructor(
		message: string,
		{
			line = 1,
			col = 0,
			raw = '',
			nodeName = null,
		}: {
			readonly line?: number;
			readonly col?: number;
			readonly raw?: string;
			readonly nodeName?: string | null;
		},
	) {
		super(nodeName ? `The ${nodeName} is invalid element (${line}:${col}): ${message}` : message);

		this.line = line;
		this.col = col;
		this.raw = raw;
		this.nodeName = nodeName;
	}
}
