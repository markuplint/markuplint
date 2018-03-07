import { Indentation } from './';
import Location from './location';

import getCol from './parser/get-col';
import getLine from './parser/get-line';

export default class Token {

	public static create (token: string, line: number, col: number, offset: number): Token;
	public static create (token: null, line: number, col: number, offset: number): null;
	public static create (token: string | null, line: number, col: number, offset: number): Token | null;
	public static create (token: string | null, line: number, col: number, offset: number): Token | null {
		if (token == null) {
			return null;
		}
		return new Token(token, line, col, offset);
	}

	public readonly _originRaw: string;
	public _fixed: string;
	public location: Location;

	// /**
	//  * @deprecated
	//  */
	// public indentation: Indentation | null = null;

	constructor (raw: string, line: number, col: number, startOffset: number) {
		this._originRaw = raw;
		this._fixed = raw;
		this.location = new Location(
			line,
			col,
			getLine(raw, line),
			getCol(raw, col),
			startOffset,
			startOffset + raw.length,
		);
	}

	public get raw () {
		return this._fixed;
	}

	public get line () {
		return this.location.line;
	}

	public get col () {
		return this.location.col;
	}

	public toJSON () {
		return {
			raw: this.raw,
			line: this.line,
			col: this.col,
			endLine: this.location.endLine,
			endCol: this.location.endCol,
			startOffset: this.location.startOffset,
			endOffset: this.location.endOffset,
		};
	}

	public fix (raw: string) {
		this._fixed = raw;
	}
}

