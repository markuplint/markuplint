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
