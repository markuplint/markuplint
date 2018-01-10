"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
function parseRawTag(rawStartTag, nodeLine, nodeCol) {
    let line = 0;
    let col = 0;
    const matches = rawStartTag.match(const_1.reStartTag);
    if (!matches) {
        throw new SyntaxError('Invalid tag syntax');
    }
    const tagWithAttrs = matches[1];
    const tagNameMatches = tagWithAttrs.match(const_1.reTagName);
    if (!tagNameMatches) {
        throw new SyntaxError('Invalid tag name');
    }
    const tagName = tagNameMatches[0];
    let attrString = tagWithAttrs.substring(tagName.length);
    col += tagName.length + 1;
    const attrs = [];
    while (const_1.reAttrsInStartTag.test(attrString)) {
        const attrMatchedMap = attrString.match(const_1.reAttrsInStartTag);
        if (attrMatchedMap) {
            const raw = attrMatchedMap[0];
            const name = attrMatchedMap[1];
            const equal = attrMatchedMap[2] || null;
            const quote = attrMatchedMap[3] != null ? '"' : attrMatchedMap[4] != null ? "'" : null;
            const value = attrMatchedMap[3] || attrMatchedMap[4] || attrMatchedMap[5] || null;
            const index = attrMatchedMap.index; // no global matches
            const shaveLength = raw.length + index;
            const shavedString = attrString.substr(0, shaveLength);
            const invalid = !!(value && quote === null && /["'=<>`]/.test(value)) || !!(equal && quote === null && value === null);
            col += index;
            if (/\r?\n/.test(shavedString)) {
                const lineSplited = shavedString.split(/\r?\n/g);
                line += lineSplited.length - 1;
                const lastLine = lineSplited.slice(-1)[0];
                col = lastLine.indexOf(name);
            }
            // Debug Log
            // console.log(rawStartTag.replace(/\r?\n/g, '⏎').replace(/\t/g, '→'));
            // console.log(rawStartTag.replace(/\t/g, '→'));
            // console.log(`${'_'.repeat(col)}${raw}`);
            // console.log({ name, equal, quote, value, col, line });
            // console.log({ shavedString: shavedString.replace(/\r?\n/g, '⏎').replace(/\t/g, '→'), col, line });
            // console.log('\n\n');
            attrs.push({
                name,
                value,
                quote,
                equal,
                line: line + nodeLine,
                col: line === 0 ? col + nodeCol : col + 1,
                raw,
                invalid,
            });
            attrString = attrString.substring(shaveLength);
            col += raw.length;
        }
    }
    return {
        tagName,
        attrs,
    };
}
exports.parseRawTag = parseRawTag;
