"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseRawTag(rawStartTag) {
    // const denyAttrNameCharactersRegExp = /[ "'>\/=\uFDD0-\uFDEF\uFFFF]/;
    const matches = rawStartTag.match(/<([^>]+)>/);
    if (!matches) {
        throw new Error();
    }
    const tagWithAttrs = matches[1];
    if (!tagWithAttrs) {
        throw new Error();
    }
    // TODO: fix easy spliting...😆
    const [tagName, ...rawAttrs] = tagWithAttrs.trim().split(/\s+/).map(node => node.trim());
    let shavedOffset = tagName.length + 1; // +1 is "<" character.
    let shavedTag = tagWithAttrs.substring(tagName.length);
    const attrs = [];
    for (const rawAttr of rawAttrs) {
        let line = 0;
        let attrIndex = 0;
        if (/\r\n|\n/.test(shavedTag)) {
            const lines = shavedTag.split(/\r\n|\n/);
            for (const lineStr of lines) {
                attrIndex = shavedTag.indexOf(rawAttr);
                if (attrIndex >= 0) {
                    break;
                }
                line += 1;
            }
            shavedOffset = 0;
        }
        else {
            attrIndex = shavedTag.indexOf(rawAttr);
        }
        console.log(`${'_'.repeat(shavedOffset)}${shavedTag}`);
        const col = shavedOffset + attrIndex;
        shavedTag = shavedTag.substring(attrIndex + rawAttr.length);
        shavedOffset += attrIndex + rawAttr.length;
        console.log(rawStartTag);
        console.log(`${' '.repeat(col)}^`);
        console.log(`${' '.repeat(col)}${col}`);
        console.log('\n\n');
        const nameAndValue = rawAttr.split('=');
        const name = nameAndValue[0];
        if (!name) {
            throw new Error('Expected unreachable code');
        }
        let value = null;
        let quote = null;
        const valueWithQuote = nameAndValue[1] || null;
        if (valueWithQuote) {
            const valueWithQuoteMatches = valueWithQuote.match(/^("|')?(.+)\1$/);
            if (!valueWithQuoteMatches) {
                throw new Error();
            }
            value = valueWithQuoteMatches[2] || null; // tslint:disable-line:no-magic-numbers
            const _quote = valueWithQuoteMatches[1];
            switch (_quote) {
                case '"':
                case "'":
                    quote = _quote;
            }
        }
        attrs.push({
            name,
            value,
            quote,
            line,
            col,
            raw: rawAttr,
        });
    }
    return {
        tagName,
        attrs,
    };
}
exports.parseRawTag = parseRawTag;
