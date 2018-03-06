"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const attribute_value_1 = __importDefault(require("./attribute-value"));
const token_1 = __importDefault(require("./token"));
const reAttrsInStartTag = /(\s*)([^\x00-\x1f\x7f-\x9f "'>\/=]+)(?:(\s*)(=)(\s*)(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s]*)))?/;
class Attribute extends token_1.default {
    constructor(raw, line, col, startOffset) {
        const attrMatchedMap = raw.match(reAttrsInStartTag);
        if (!attrMatchedMap) {
            throw new SyntaxError('Illegal attribute token');
        }
        const beforeSpaces = attrMatchedMap[1];
        const name = attrMatchedMap[2];
        const spacesBeforeEqual = attrMatchedMap[3] || '';
        const equal = attrMatchedMap[4] || null;
        const spacesAfterEqual = attrMatchedMap[5] || '';
        const quote = attrMatchedMap[6] != null ? '"' : attrMatchedMap[7] != null ? "'" : null;
        const value = attrMatchedMap[6] || attrMatchedMap[7] || attrMatchedMap[8] || null;
        const index = attrMatchedMap.index; // no global matches
        const invalid = !!(value && quote === null && /["'=<>`]/.test(value)) || !!(equal && quote === null && value === null);
        // console.log({beforeSpaces, name, spacesBeforeEqual, equal, spacesAfterEqual, quote, value});
        let offset = startOffset;
        const beforeSpacesToken = token_1.default.create(beforeSpaces, line, col, offset);
        line = beforeSpacesToken.location.endLine;
        col = beforeSpacesToken.location.endCol;
        offset = beforeSpacesToken.location.endOffset;
        super(raw.substr(beforeSpaces.length), line, col, offset);
        this.beforeSpaces = beforeSpacesToken;
        this.name = token_1.default.create(name, line, col, offset);
        line = this.name.location.endLine;
        col = this.name.location.endCol;
        offset = this.name.location.endOffset;
        this.spacesBeforeEqual = token_1.default.create(spacesBeforeEqual, line, col, offset);
        line = this.spacesBeforeEqual.location.endLine;
        col = this.spacesBeforeEqual.location.endCol;
        offset = this.spacesBeforeEqual.location.endOffset;
        this.equal = token_1.default.create(equal, line, col, offset);
        if (this.equal) {
            line = this.equal.location.endLine;
            col = this.equal.location.endCol;
            offset = this.equal.location.endOffset;
        }
        this.spacesAfterEqual = token_1.default.create(spacesAfterEqual, line, col, offset);
        line = this.spacesAfterEqual.location.endLine;
        col = this.spacesAfterEqual.location.endCol;
        offset = this.spacesAfterEqual.location.endOffset;
        if (value) {
            this.value = new attribute_value_1.default(value, quote, line, col, offset);
            line = this.value.location.endLine;
            col = this.value.location.endCol;
            offset = this.value.location.endOffset;
        }
        else {
            this.value = null;
        }
        // TODO:
        // this.afterSpaces = Token.create(raw, line, col, offset);
        // line = this.afterSpaces.location.endLine;
        // col = this.afterSpaces.location.endCol;
        // offset = this.afterSpaces.location.endOffset;
        this.invalid = invalid;
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
            name: this.name.toJSON(),
            value: this.value ? this.value.toJSON() : null,
            equal: this.equal ? this.equal.toJSON() : null,
            invalid: this.invalid,
        };
    }
}
exports.default = Attribute;
