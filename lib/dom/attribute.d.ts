import Token from './token';
export default class Attribute extends Token {
    readonly name: Token;
    readonly value: Token | null;
    readonly quote: '"' | "'" | null;
    readonly equal: Token | null;
    readonly invalid: boolean;
    constructor(attrString: string, line: number, col: number, startOffset: number);
    toJSON(): {
        name: string;
        value: string | null;
        quote: "\"" | "'" | null;
        col: number;
        line: number;
        equal: string | null;
        raw: string;
        invalid: boolean;
    };
}
