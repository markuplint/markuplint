export type ParserErrorInfo = {
	readonly line?: number;
	readonly col?: number;
	readonly raw?: string;
	readonly stack?: string;
};

export class ParserError extends Error {
	readonly col: number;
	readonly line: number;
	name = 'ParserError';
	readonly raw: string;

	constructor(message: string, info: ParserErrorInfo) {
		super(message);
		this.line = info.line ?? 1;
		this.col = info.col ?? 0;
		this.raw = info.raw ?? '';
		this.stack = info.stack ?? this.stack;
	}
}

export class TargetParserError extends ParserError {
	name = 'TargetParserError';
	readonly nodeName: string | null;

	constructor(
		message: string,
		info: ParserErrorInfo & {
			readonly nodeName?: string | null;
		},
	) {
		const errMsg = info.nodeName
			? `The ${info.nodeName} is invalid element (${info.line}:${info.col}): ${message}`
			: message;
		super(errMsg, info);

		this.nodeName = info.nodeName ?? null;
	}
}

export class ConfigParserError extends ParserError {
	readonly filePath: string;
	name = 'ConfigParserError';

	constructor(
		message: string,
		info: ParserErrorInfo & {
			readonly filePath: string;
		},
	) {
		const pos = info.line != null && info.line != null ? `(${info.line}:${info.col})` : '';
		const file = ` in ${info.filePath}${pos}`;
		const errMsg = `${message}${file}`;
		super(errMsg, info);

		this.filePath = info.filePath;
	}
}
