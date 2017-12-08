"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'attr-duplication';
    }
    async verify(document, config, ruleset, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'Duplicate {0}', 'attribute name');
        document.walk((node) => {
            if (node instanceof parser_1.Element) {
                for (const attr of node.attributes) {
                    const attrNameStack = [];
                    for (const rawAttr of attr.rawAttr) {
                        const attrName = rawAttr.name.toLowerCase();
                        if (attrNameStack.includes(attrName)) {
                            reports.push({
                                level: this.defaultLevel,
                                message,
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
exports.default = default_1;
