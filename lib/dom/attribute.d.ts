import Token from './token';
export default class Attribute extends Token {
    readonly name: Token;
    readonly value: Token | null;
    readonly quote: '"' | "'" | null;
    readonly equal: Token | null;
    readonly invalid: boolean;
    constructor(raw: string, line: number, col: number, startOffset: number);
    toJSON(): {
        name: {
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
        value: {
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
        } | null;
        quote: "\"" | "'" | null;
        equal: {
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
        } | null;
        invalid: boolean;
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
