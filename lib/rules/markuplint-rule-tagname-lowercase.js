"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../parser");
const rule_1 = require("../rule");
/**
 * `tagname-lowercase`
 *
 * *Core rule*
 */
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'tagname-lowercase';
    }
    verify(document, config, ruleset) {
        const reports = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                if (/[A-Z]/.test(node.nodeName)) {
                    const line = node.line;
                    const col = node.col;
                    reports.push({
                        level: this.defaultLevel,
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
exports.default = default_1;
