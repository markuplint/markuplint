"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseRawTag(rawStartTag) {
    let line = 0;
    let col = 0;
    const matches = rawStartTag.match(/<([^>]+)>/);
    if (!matches) {
        throw new SyntaxError('Invalid tag syntax');
    }
    const tagWithAttrs = matches[1];
    // HTML Standard elements /^[a-z]+/
    // HTML Custom elements /^[a-z]+(-[a-z]+)+/
    // Namespaced element /^[a-z]+:[a-z]+/
    const tagNameMatches = tagWithAttrs.match(/^(?:[a-z]+:)?[a-z]+(?:-[a-z]+)*/i);
    if (!tagNameMatches) {
        throw new SyntaxError('Invalid tag name');
    }
    const tagName = tagNameMatches[0];
    let attrString = tagWithAttrs.substring(tagName.length);
    col += tagName.length + 1;
    const regAttr = /([^\x00-\x1f\x7f-\x9f "'>\/=]+)(?:\s*=\s*(?:("|')([^\2]*)\2|([^ "'=<>`]+)))?/;
    const attrs = [];
    while (regAttr.test(attrString)) {
        const attrMatchedMap = attrString.match(regAttr);
        if (attrMatchedMap) {
            const raw = attrMatchedMap[0];
            const name = attrMatchedMap[1];
            const quote = attrMatchedMap[2] || null; // tslint:disable-line:no-magic-numbers
            const value = (quote ? attrMatchedMap[3] : attrMatchedMap[4]) || null; // tslint:disable-line:no-magic-numbers
            const index = attrMatchedMap.index; // no global matches
            const shaveLength = raw.length + index;
            const shavedString = attrString.substr(0, shaveLength);
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
            // console.log({ name, quote, value, col, line });
            // console.log({ shavedString: shavedString.replace(/\r?\n/g, '⏎').replace(/\t/g, '→'), col, line });
            // console.log('\n\n');
            attrs.push({
                name,
                value,
                quote,
                line,
                col,
                raw,
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
