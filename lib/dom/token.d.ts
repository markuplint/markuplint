import { Indentation } from './';
import Location from './location';
export default class Token {
    readonly raw: string;
    location: Location;
    beforeSpaces: BeforeSpaces;
    /**
     * @deprecated
     */
    indentation: Indentation | null;
    constructor(raw: string, line: number, col: number, startOffset: number, indentRaw?: string);
    readonly line: number;
    readonly col: number;
    toJSON(): {
        raw: string;
        beforeSpaces: {
            raw: string;
            style: "tab" | "space" | "mixed" | "none";
        };
        line: number;
        col: number;
        endLine: number;
        endCol: number;
        startOffset: number;
        endOffset: number;
    };
}
export declare class BeforeSpaces {
    readonly raw: string;
    readonly style: 'tab' | 'space' | 'mixed' | 'none';
    constructor(raw: string);
    isIndentSpace(): boolean;
    toJSON(): {
        raw: string;
        style: "tab" | "space" | "mixed" | "none";
    };
}
