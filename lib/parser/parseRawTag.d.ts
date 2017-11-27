export interface RawAttribute {
    name: string;
    value: string | null;
    quote: '"' | "'" | null;
    line: number;
    col: number;
    raw: string;
}
export declare function parseRawTag(rawStartTag: string): {
    tagName: string;
    attrs: RawAttribute[];
};
