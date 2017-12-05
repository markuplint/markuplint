"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
/**
 * `attr-lowercase`
 *
 * *Core rule*
 */
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'case-sensitive-attr-name';
    }
    verify(document, config, ruleset) {
        const reports = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
                if (node.attributes) {
                    for (const attr of node.attributes) {
                        const attrOffset = attr.startOffset - node.startOffset;
                        const distance = attr.endOffset - attr.startOffset;
                        const rawAttr = node.raw.substr(attrOffset, distance);
                        const rawAttrName = rawAttr.split('=')[0].trim();
                        if (/[A-Z]/.test(rawAttrName)) {
                            const line = node.line;
                            const col = node.col;
                            reports.push({
                                level: this.defaultLevel,
                                message: 'HTMLElement attribute name must be lowercase',
                                line: attr.line,
                                col: attr.col,
                                raw: rawAttr,
                            });
                        }
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
