import Attribute from '../dom/attribute';
export default function parseRawTag(rawStartTag: string, nodeLine: number, nodeCol: number, startOffset: number): {
    tagName: string;
    attrs: Attribute[];
    toJSON(): {
        tagName: string;
        attrs: {
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
        }[];
    };
};
