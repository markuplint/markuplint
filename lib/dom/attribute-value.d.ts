import Token from './token';
export default class AttributeValue extends Token {
    readonly value: string;
    readonly quote: '"' | "'" | null;
    constructor(value: string, quote: '"' | "'" | null, line: number, col: number, startOffset: number);
    toJSON(): {
        raw: string;
        line: number;
        col: number;
        endLine: number;
        endCol: number;
        startOffset: number;
        endOffset: number;
        value: string;
        quote: "\"" | "'" | null;
    };
}
