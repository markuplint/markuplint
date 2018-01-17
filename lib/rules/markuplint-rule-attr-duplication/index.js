"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
exports.default = rule_1.CustomRule.create({
    name: 'attr-duplication',
    defaultValue: null,
    defaultOptions: null,
    async verify(document, locale) {
        const reports = [];
        const message = await messages_1.default(locale, 'Duplicate {0}', 'attribute name');
        await document.walkOn('Element', async (node) => {
            if (!node.rule) {
                return;
            }
            const attrNameStack = [];
            for (const attr of node.attributes) {
                const attrName = attr.name.toLowerCase();
                if (attrNameStack.includes(attrName)) {
                    reports.push({
                        level: node.rule.level,
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
        });
        return reports;
    },
});
