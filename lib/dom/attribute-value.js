"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const token_1 = __importDefault(require("./token"));
class AttributeValue extends token_1.default {
    constructor(value, quote, line, col, startOffset) {
        const quoteStr = quote || '';
        super(`${quoteStr}${value}${quoteStr}`, line, col, startOffset);
        this.value = value;
        this.quote = quote;
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
            value: this.value,
            quote: this.quote,
        };
    }
}
exports.default = AttributeValue;
