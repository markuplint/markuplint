import AttributeValue from './attribute-value';
import Token from './token';
export default class Attribute extends Token {
    readonly name: Token;
    readonly value: AttributeValue | null;
    readonly equal: Token | null;
    readonly spacesBeforeEqual: Token | null;
    readonly spacesAfterEqual: Token | null;
    readonly beforeSpaces: Token;
    readonly afterSpaces: Token;
    readonly invalid: boolean;
    constructor(raw: string, line: number, col: number, startOffset: number);
    toJSON(): {
        raw: string;
        line: number;
        col: number;
        endLine: number;
        endCol: number;
        startOffset: number;
        endOffset: number;
        name: {
            raw: string;
            line: number;
            col: number;
            endLine: number;
            endCol: number;
            startOffset: number;
            endOffset: number;
        };
        value: {
            raw: string;
            line: number;
            col: number;
            endLine: number;
            endCol: number;
            startOffset: number;
            endOffset: number;
            value: string;
            quote: "\"" | "'" | null;
        } | null;
        equal: {
            raw: string;
            line: number;
            col: number;
            endLine: number;
            endCol: number;
            startOffset: number;
            endOffset: number;
        } | null;
        invalid: boolean;
    };
}
