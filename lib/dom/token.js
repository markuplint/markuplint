"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const location_1 = __importDefault(require("./location"));
const get_col_1 = __importDefault(require("../parser/get-col"));
const get_line_1 = __importDefault(require("../parser/get-line"));
class Token {
    constructor(raw, line, col, startOffset, indentRaw = '') {
        /**
         * @deprecated
         */
        this.indentation = null;
        this.raw = raw;
        this.location = new location_1.default(line, col, get_line_1.default(raw, line), get_col_1.default(raw, col), startOffset, startOffset + raw.length);
        this.beforeSpaces = new BeforeSpaces(indentRaw);
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
            beforeSpaces: this.beforeSpaces.toJSON(),
            line: this.line,
            col: this.col,
            endLine: this.location.endLine,
            endCol: this.location.endCol,
            startOffset: this.location.startOffset,
            endOffset: this.location.endOffset,
        };
    }
}
exports.default = Token;
class BeforeSpaces {
    constructor(raw) {
        this.raw = raw;
        if (!raw) {
            this.style = 'none';
        }
        else if (/\t+/.test(raw)) {
            this.style = 'tab';
        }
        else if (/ +/.test(raw)) {
            this.style = 'space';
        }
        else {
            this.style = 'mixed';
        }
    }
    isIndentSpace() {
        return /\r?\n/.test(this.raw);
    }
    toJSON() {
        return {
            raw: this.raw,
            style: this.style,
        };
    }
}
exports.BeforeSpaces = BeforeSpaces;
