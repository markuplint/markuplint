export interface RawAttribute {
    name: string;
    value: string | null;
    quote: '"' | "'" | null;
    line: number;
    col: number;
    raw: string;
    invalid: boolean;
}
export declare function parseRawTag(rawStartTag: string, nodeLine: number, nodeCol: number): {
    tagName: string;
    attrs: RawAttribute[];
};
