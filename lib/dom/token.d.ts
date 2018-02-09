import { Indentation } from './';
import Location from './location';
export default class Token {
    static create(token: string, line: number, col: number, offset: number): Token;
    static create(token: null, line: number, col: number, offset: number): null;
    static create(token: string | null, line: number, col: number, offset: number): Token | null;
    readonly raw: string;
    location: Location;
    /**
     * @deprecated
     */
    indentation: Indentation | null;
    constructor(raw: string, line: number, col: number, startOffset: number);
    readonly line: number;
    readonly col: number;
    toJSON(): {
        raw: string;
        line: number;
        col: number;
        endLine: number;
        endCol: number;
        startOffset: number;
        endOffset: number;
    };
}
