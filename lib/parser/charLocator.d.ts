export interface Location {
    line: number;
    col: number;
    raw: string;
}
export default function (searches: string[], text: string, currentLine: number, currentCol: number): Location[];
