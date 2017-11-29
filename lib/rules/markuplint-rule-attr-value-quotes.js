"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../parser");
const rule_1 = require("../rule");
/**
 * `attr-value-quotes`
 *
 * *Core rule*
 */
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'attr-value-quotes';
        this.defaultValue = 'double';
    }
    verify(document, config, ruleset) {
        const quote = {
            double: '"',
            single: "'",
        };
        const reports = [];
        document.walk((node) => {
            if (node instanceof parser_1.Element) {
                for (const attr of node.attributes) {
                    for (const rawAttr of attr.rawAttr) {
                        if (rawAttr.quote !== quote[config.value]) {
                            reports.push({
                                level: this.defaultLevel,
                                message: `Attribute value is must quote on ${config.value}`,
                                line: rawAttr.line + node.line,
                                col: rawAttr.line === 0 ? rawAttr.col + node.col - 1 : rawAttr.col,
                                raw: rawAttr.raw,
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
