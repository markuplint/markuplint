"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const location_1 = __importDefault(require("./location"));
const get_col_1 = __importDefault(require("../parser/get-col"));
const get_line_1 = __importDefault(require("../parser/get-line"));
class Token {
    constructor(raw, line, col, startOffset) {
        this.indentation = null;
        this.raw = raw;
        this.location = new location_1.default(line, col, get_line_1.default(raw, line), get_col_1.default(raw, col), startOffset, startOffset + raw.length);
    }
    get line() {
        return this.location.line;
    }
    get col() {
        return this.location.col;
    }
}
exports.default = Token;
