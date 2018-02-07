import Attribute from '../dom/attribute';
export default function parseRawTag(rawStartTag: string, nodeLine: number, nodeCol: number, startOffset: number): {
    tagName: string;
    attrs: Attribute[];
    toJSON(): {
        tagName: string;
        attrs: {
            name: string;
            value: string | null;
            quote: "\"" | "'" | null;
            col: number;
            line: number;
            equal: string | null;
            raw: string;
            invalid: boolean;
        }[];
    };
};
