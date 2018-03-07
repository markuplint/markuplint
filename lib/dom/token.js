"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const location_1 = __importDefault(require("./location"));
const get_col_1 = __importDefault(require("./parser/get-col"));
const get_line_1 = __importDefault(require("./parser/get-line"));
class Token {
    static create(token, line, col, offset) {
        if (token == null) {
            return null;
        }
        return new Token(token, line, col, offset);
    }
    // /**
    //  * @deprecated
    //  */
    // public indentation: Indentation | null = null;
    constructor(raw, line, col, startOffset) {
        this._originRaw = raw;
        this._fixed = raw;
        this.location = new location_1.default(line, col, get_line_1.default(raw, line), get_col_1.default(raw, col), startOffset, startOffset + raw.length);
    }
    get raw() {
        return this._fixed;
    }
    get line() {
        return this.location.line;
    }
    get col() {
        return this.location.col;
    }
    toJSON() {
        return {
            raw: this.raw,
            line: this.line,
            col: this.col,
            endLine: this.location.endLine,
            endCol: this.location.endCol,
            startOffset: this.location.startOffset,
            endOffset: this.location.endOffset,
        };
    }
    fix(raw) {
        this._fixed = raw;
    }
}
exports.default = Token;
