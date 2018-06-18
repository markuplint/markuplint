import Attribute from '../attribute';
export default function parseRawTag(raw: string, nodeLine: number, nodeCol: number, startOffset: number): {
    tagName: string;
    attrs: Attribute[];
    toJSON: () => {
        tagName: string;
        attrs: {
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
        }[];
    };
};
//# sourceMappingURL=parse-raw-tag.d.ts.map