"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../parser");
const rule_1 = require("../rule");
/**
 * `attr-value-double-quotes`
 *
 * *Core rule*
 */
class AttrValueDoubleQuotes extends rule_1.default {
    verify(document, ruleset) {
        const reports = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element) {
                for (const attr of node.attributes) {
                    const attrNameStack = [];
                    for (const rawAttr of attr.rawAttr) {
                        const attrName = rawAttr.name.toLowerCase();
                        if (attrNameStack.includes(attrName)) {
                            reports.push({
                                message: 'Duplication of attribute.',
                                line: rawAttr.line + node.line,
                                col: rawAttr.line === 0 ? rawAttr.col + node.col - 1 : rawAttr.col,
                                raw: rawAttr.raw,
                            });
                        }
                        else {
                            attrNameStack.push(attrName);
                        }
                    }
                }
            }
        });
        return reports;
    }
}
exports.AttrValueDoubleQuotes = AttrValueDoubleQuotes;
exports.default = new AttrValueDoubleQuotes('attr-value-double-quotes');
