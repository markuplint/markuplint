import { Indentation } from './';
import Location from './location';
export default class Token {
    readonly raw: string;
    location: Location;
    indentation: Indentation | null;
    constructor(raw: string, line: number, col: number, startOffset: number);
    readonly line: number;
    readonly col: number;
}
