/**
 * Positional and contextual information associated with a parser error,
 * used to construct meaningful error messages with source locations.
 */
export type ParserErrorInfo = {
	readonly line?: number;
	readonly col?: number;
	readonly raw?: string;
	readonly stack?: string;
};

/**
 * An error that occurs during parsing, carrying the source line, column,
 * and raw text where the error was encountered.
 */
export class ParserError extends Error {
	readonly col: number;
	readonly line: number;
	name = 'ParserError';
	readonly raw: string;

	/**
	 * @param message - Human-readable description of the parse error
	 * @param info - Source location and context where the error occurred
	 */
	constructor(message: string, info: ParserErrorInfo) {
		super(message);
		this.line = info.line ?? 1;
		this.col = info.col ?? 0;
		this.raw = info.raw ?? '';
		this.stack = info.stack ?? this.stack;
	}
}

/**
 * A parser error specific to a particular HTML element, including
 * the node name of the element that caused the error in the message.
 */
export class TargetParserError extends ParserError {
	name = 'TargetParserError';
	readonly nodeName: string | null;

	/**
	 * @param message - Human-readable description of the parse error
	 * @param info - Source location, context, and the element's node name
	 */
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

/**
 * A parser error that occurs while reading a configuration file,
 * including the file path in the error message for easier debugging.
 */
export class ConfigParserError extends ParserError {
	readonly filePath: string;
	name = 'ConfigParserError';

	/**
	 * @param message - Human-readable description of the parse error
	 * @param info - Source location, context, and path to the config file
	 */
	constructor(
		message: string,
		info: ParserErrorInfo & {
			readonly filePath: string;
		},
	) {
		const pos = info.line != null && info.col != null ? `(${info.line}:${info.col})` : '';
		const file = ` in ${info.filePath}${pos}`;
		const errMsg = `${message}${file}`;
		super(errMsg, info);

		this.filePath = info.filePath;
	}
}
