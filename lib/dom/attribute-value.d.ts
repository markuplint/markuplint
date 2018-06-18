import Token from './token';
export default class AttributeValue extends Token {
    private _value;
    private _quote;
    constructor(value: string, quote: '"' | "'" | null, line: number, col: number, startOffset: number);
    readonly value: string;
    readonly quote: "\"" | "'" | null;
    readonly raw: string;
    fix(fixedValue: string | null, fixedQuote?: '"' | "'" | null): void;
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
//# sourceMappingURL=attribute-value.d.ts.map