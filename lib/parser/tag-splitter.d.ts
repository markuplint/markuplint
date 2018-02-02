export interface N {
    type: 'text' | 'starttag' | 'endtag' | 'comment' | 'boguscomment';
    raw: string;
    line: number;
    col: number;
}
export default function tagSplitter(raw: string, line: number, col: number): N[];
