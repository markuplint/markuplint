export default class Location {
    readonly line: number;
    readonly col: number;
    readonly endLine: number;
    readonly endCol: number;
    readonly startOffset: number;
    readonly endOffset: number;
    constructor(line: number, col: number, endLine: number, endCol: number, startOffset: number, endOffset: number);
}
