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
        this._value = value;
        this._quote = quote;
    }
    get value() {
        return this._value;
    }
    get quote() {
        return this._quote;
    }
    get raw() {
        const raw = [];
        if (this._quote) {
            raw.push(this._quote);
        }
        if (this._value) {
            raw.push(this._value);
        }
        if (this._quote) {
            raw.push(this._quote);
        }
        return raw.join('');
    }
    fix(fixedValue, fixedQuote) {
        if (fixedValue != null) {
            this._value = fixedValue;
        }
        if (fixedQuote !== undefined) {
            this._quote = fixedQuote;
        }
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
