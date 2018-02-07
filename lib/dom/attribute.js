"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const token_1 = __importDefault(require("./token"));
const const_1 = require("../parser/const");
class Attribute extends token_1.default {
    constructor(attrString, line, col, startOffset) {
        super(attrString, line, col, startOffset);
        const attrMatchedMap = attrString.match(const_1.reAttrsInStartTag);
        const raw = attrMatchedMap[0];
        const name = attrMatchedMap[1];
        const equal = attrMatchedMap[2] || null;
        const quote = attrMatchedMap[3] != null ? '"' : attrMatchedMap[4] != null ? "'" : null;
        const value = attrMatchedMap[3] || attrMatchedMap[4] || attrMatchedMap[5] || null;
        const index = attrMatchedMap.index; // no global matches
        const invalid = !!(value && quote === null && /["'=<>`]/.test(value)) || !!(equal && quote === null && value === null);
        col += index;
        if (/\r?\n/.test(attrString)) {
            const lineSplited = attrString.split(/\r?\n/g);
            line += lineSplited.length - 1;
            const lastLine = lineSplited.slice(-1)[0];
            col = lastLine.indexOf(name);
        }
        // Debug Log
        console.log(`${'_'.repeat(col)}${raw}`);
        console.log({ name, equal, quote, value, col, line });
        console.log({ attrString: attrString.replace(/\r?\n/g, '⏎').replace(/\t/g, '→'), col, line });
        console.log('\n\n');
        // @ts-ignore
        this.name = new token_1.default(name);
        // @ts-ignore
        this.value = value ? new token_1.default(value) : null;
        // @ts-ignore
        this.equal = equal ? new token_1.default(equal) : null;
        this.quote = quote;
        this.invalid = invalid;
    }
    toJSON() {
        return {
            name: this.name.raw,
            value: this.value ? this.value.raw : null,
            quote: this.quote,
            col: this.col,
            line: this.line,
            equal: this.equal ? this.equal.raw : null,
            raw: this.raw,
            invalid: this.invalid,
        };
    }
}
exports.default = Attribute;
