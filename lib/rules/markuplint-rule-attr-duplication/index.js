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
        await document.walk(async (node) => {
            if (node instanceof parser_1.Element) {
                const attrNameStack = [];
                for (const attr of node.attributes) {
                    const attrName = attr.name.toLowerCase();
                    if (attrNameStack.includes(attrName)) {
                        reports.push({
                            level: config.level,
                            message,
                            line: attr.location.line,
                            col: attr.location.col,
                            raw: attr.raw,
                        });
                    }
                    else {
                        attrNameStack.push(attrName);
                    }
                }
            }
        });
        return reports;
    }
}
exports.default = default_1;
