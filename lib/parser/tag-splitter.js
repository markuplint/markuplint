"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
const get_col_1 = require("./get-col");
const get_line_1 = require("./get-line");
function tagSplitter(raw, line, col) {
    return withLocation(tagSplitterAsString(raw), line, col);
}
exports.default = tagSplitter;
function tagSplitterAsString(raw) {
    const tagMatches = raw.match(const_1.reSplitterTag);
    if (!tagMatches) {
        return [raw];
    }
    const tokens = Array.from(tagMatches);
    tokens.unshift(); // remove all match
    const nodes = [];
    let rest = raw;
    for (const token of tokens) {
        const index = rest.indexOf(token);
        let length = token.length;
        if (index > 0) {
            const text = rest.slice(0, index);
            nodes.push(text);
            length += text.length;
        }
        nodes.push(token);
        rest = rest.slice(length);
    }
    if (rest) {
        nodes.push(rest);
    }
    return nodes;
}
function withLocation(nodes, line, col) {
    const result = [];
    for (const node of nodes) {
        if (node[0] !== '<') {
            result.push({
                type: 'text',
                raw: node,
                line,
                col,
            });
        }
        else {
            const label = node.slice(1).slice(0, -1);
            if (const_1.reTagName.test(label)) {
                result.push({
                    type: 'starttag',
                    raw: node,
                    line,
                    col,
                });
            }
            else if (label[0] === '/') {
                result.push({
                    type: 'endtag',
                    raw: node,
                    line,
                    col,
                });
            }
            else if (label[0] === '!') {
                result.push({
                    type: 'comment',
                    raw: node,
                    line,
                    col,
                });
            }
            else if (label[0] === '?') {
                result.push({
                    type: 'boguscomment',
                    raw: node,
                    line,
                    col,
                });
            }
            else {
                result.push({
                    type: 'text',
                    raw: node,
                    line,
                    col,
                });
            }
        }
        line = get_line_1.default(node, line);
        col = get_col_1.default(node, col);
    }
    return result;
}
