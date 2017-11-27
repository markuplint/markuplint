"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../parser");
const rule_1 = require("../rule");
/**
 * `tagname-lowercase`
 *
 * *Core rule*
 */
class TagnameLowercase extends rule_1.default {
    verify(document, ruleset) {
        const reports = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                if (/[A-Z]/.test(node.nodeName)) {
                    const line = node.line;
                    const col = node.col;
                    reports.push({
                        message: 'HTMLElement name must be lowercase',
                        line: node.line,
                        col: node.col,
                        raw: node.raw,
                    });
                }
            }
        });
        return reports;
    }
}
exports.TagnameLowercase = TagnameLowercase;
exports.default = new TagnameLowercase('tagname-lowercase');
