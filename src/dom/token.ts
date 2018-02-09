import { Indentation } from './';
import Location from './location';

import getCol from './parser/get-col';
import getLine from './parser/get-line';

export default class Token {
	public readonly raw: string;
	public location: Location;
	public beforeSpaces: BeforeSpaces;

	/**
	 * @deprecated
	 */
	public indentation: Indentation | null = null;

	constructor (raw: string, line: number, col: number, startOffset: number, indentRaw = '') {
		this.raw = raw;
		this.location = new Location(
			line,
			col,
			getLine(raw, line),
			getCol(raw, col),
			startOffset,
			startOffset + raw.length,
		);
		this.beforeSpaces = new BeforeSpaces(indentRaw);
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
			beforeSpaces: this.beforeSpaces.toJSON(),
			line: this.line,
			col: this.col,
			endLine: this.location.endLine,
			endCol: this.location.endCol,
			startOffset: this.location.startOffset,
			endOffset: this.location.endOffset,
		};
	}
}

export class BeforeSpaces {
	public readonly raw: string;
	public readonly style: 'tab' | 'space' | 'mixed' | 'none';

	constructor (raw: string) {
		this.raw = raw;
		if (!raw) {
			this.style = 'none';
		} else if (/\t+/.test(raw)) {
			this.style = 'tab';
		} else if (/ +/.test(raw)) {
			this.style = 'space';
		} else {
			this.style = 'mixed';
		}
	}

	public isIndentSpace () {
		return /\r?\n/.test(this.raw);
	}

	public toJSON () {
		return {
			raw: this.raw,
			style: this.style,
		};
	}
}
